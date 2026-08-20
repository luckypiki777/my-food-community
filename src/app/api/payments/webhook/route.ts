import type { NextRequest } from "next/server";

import {
  completePayment,
  parsePaymentId,
  portoneConfig,
  webhookActor,
  portoneWebhookSecret,
} from "@/lib/bff/payment";
import { recordCancellation } from "@/lib/bff/paymentCancel";
import { verifyWebhook } from "@/lib/bff/paymentWebhook";
import { badRequest, fail, ok } from "@/lib/bff/response";
import {
  createSupabaseAdminClient,
  hasSupabaseAdminKey,
  type SupabaseAdminClient,
} from "@/lib/supabase/server";

/**
 * 포트원 결제 웹훅. **결제 완료와 결제 취소를 같은 문으로 받는다.**
 *
 * **로그인 게이트가 없다.** 부르는 쪽이 사용자가 아니라 포트원 서버이기 때문이다.
 * 대신 두 겹으로 막는다: 요청의 진위는 **서명 검증**이, 결제·취소의 진위는 **포트원
 * 결제 조회**가 판정한다. 본문의 "결제됐다"·"취소됐다" 는 말은 그 자체로는 아무 근거도
 * 아니다 — 웹훅 주소는 공개된 URL 이라 누구나 두드릴 수 있다. 금액조차 본문에서 읽지
 * 않는다.
 *
 * 하는 일은 하나다: 검증하고 `completePayment()`(결제) 또는 `recordCancellation()`
 * (취소)을 부른다. 판정 표(`rules/payment.md` 6절)를 여기에 다시 쓰지 않는다 —
 * 브라우저로 들어온 건과 같은 기준을 타야 한다.
 *
 * ### 응답 코드가 곧 재전송 지시다
 *
 * 포트원은 2xx 가 아니면 최대 5회(0·1·4·16·64·256분) 재전송한다. 그래서:
 *   - **2xx** — 다 됐거나, 다시 불러도 답이 안 바뀌는 경우(위변조 의심 · 우리 상점 아님 ·
 *     모르는 이벤트). 재전송해도 소용없으니 받아서 끝낸다.
 *   - **4xx** — 서명 검증 실패. 포트원이 보낸 게 아니므로 재전송할 일도 없다.
 *   - **5xx** — 지금은 못 하지만 나중엔 될 수 있는 경우(포트원 조회 실패 · DB 오류 ·
 *     설정 누락). 재전송이 곧 복구다.
 *
 * 결제 완료 화면은 이 라우트를 기다리지 않는다. 브라우저 경로(`/api/payments/complete`)와
 * 웹훅은 **서로의 안전망**이고, 둘 중 먼저 도착한 쪽이 기록한다. 완료 처리가 멱등하기
 * 때문에 순서는 상관없다.
 */
export async function POST(request: NextRequest) {
  const secret = portoneWebhookSecret();
  if (!secret) {
    // 검증할 수 없는 웹훅은 받지 않는다. 서명을 안 보고 본문을 믿으면 아무나 결제
    // 완료를 만들 수 있다. 시크릿을 채우면 재전송으로 밀린 건이 따라 들어온다.
    console.error("[api:payments/webhook] PORTONE_WEBHOOK_SECRET 이 없습니다.");
    return fail(503, "webhook_not_configured", "웹훅이 아직 설정되지 않았습니다.");
  }
  if (!hasSupabaseAdminKey()) {
    console.error("[api:payments/webhook] SUPABASE_SECRET_KEY 가 없습니다.");
    return fail(503, "webhook_not_configured", "웹훅이 아직 설정되지 않았습니다.");
  }

  // 서명은 **원문 문자열**에 대해 만들어진다. request.json() 으로 받았다가 다시
  // 직렬화하면 검증이 깨진다.
  const body = await request.text();
  const verdict = await verifyWebhook(secret, body, request.headers);
  if (!verdict.ok) {
    console.warn("[api:payments/webhook] 서명 검증 실패", { reason: verdict.reason });
    return badRequest("웹훅 서명을 확인하지 못했습니다.", "invalid_signature");
  }

  const event = verdict.event;
  if (event.kind === "ignore") {
    // 포트원은 예고 없이 새 type 을 추가한다. 모르는 이벤트는 오류가 아니라 무시다.
    return acknowledged();
  }

  // 우리 상점의 알림이 맞는가. 시크릿이 같아도 상점이 다르면 우리 결제가 아니다.
  const config = portoneConfig();
  if (config && event.storeId !== config.storeId) {
    console.warn("[api:payments/webhook] 다른 상점의 웹훅", { storeId: event.storeId });
    return acknowledged();
  }

  // 우리가 채번하는 paymentId 는 uuid 다. 아니면 우리 결제 건이 아니다.
  const paymentId = parsePaymentId(event.paymentId);
  if (!paymentId.ok) {
    console.warn("[api:payments/webhook] uuid 가 아닌 결제 건", { paymentId: event.paymentId });
    return acknowledged();
  }

  // 여기서만 RLS 를 우회한다. 웹훅에는 세션이 없어서 `auth.uid() = user_id` 정책을
  // 만족시킬 방법이 없다. 결제의 구매자는 customData 에서 오고 그 사용자가 실재하는지는
  // `webhookActor` 가 확인한다. 취소의 구매자는 원 결제 행에서 그대로 물려받는다.
  const admin = createSupabaseAdminClient();

  return event.kind === "cancel"
    ? handleCancelled(admin, paymentId.value, event.type, event.cancellationId)
    : handlePaid(admin, paymentId.value);
}

/** 결제 승인(`Transaction.Paid`). 브라우저 경로와 같은 `completePayment()` 로 간다. */
async function handlePaid(admin: SupabaseAdminClient, paymentId: string): Promise<Response> {
  const result = await completePayment(admin, webhookActor(admin), paymentId);

  if (result.ok) {
    console.info("[api:payments/webhook] 결제 확정", {
      paymentId,
      alreadyRecorded: result.alreadyRecorded,
    });
    return acknowledged();
  }

  // 다시 불러서 답이 달라질 수 있는 실패만 재전송을 요청한다.
  // 409 는 진행 중인 결제(payment_pending) 라 곧 상태가 바뀐다.
  return retryIfWorthIt("결제 확정 실패", paymentId, result.response.status);
}

/**
 * 결제 취소(`Transaction.Cancelled` · `PartialCancelled` · `CancelPending`).
 *
 * 우리가 먼저 부른 취소(`POST /api/payments/[paymentId]/cancel`)도 여기로 한 번 더
 * 돌아온다. 같은 `recordCancellation()` 을 타므로 먼저 도착한 쪽이 기록하고 나중 것은
 * 그대로 돌아간다 — 취소가 원장에 두 줄로 남지 않는다.
 *
 * 콘솔에서 직접 환불한 건도 이 길로 들어온다. 취소 웹훅이 없으면 그런 건이 우리 원장과
 * 영영 어긋난 채로 남는다.
 */
async function handleCancelled(
  admin: SupabaseAdminClient,
  paymentId: string,
  type: string,
  cancellationId: string | null,
): Promise<Response> {
  const result = await recordCancellation(admin, paymentId);

  if (result.ok) {
    if (result.kind === "already" && type === "Transaction.PartialCancelled") {
      // 부분 취소는 아직 원장에 여러 줄로 쌓지 못한다(유니크 `(transction_key, type)`).
      // 조용히 버리면 원장이 실제 환불액과 어긋난 사실이 묻히므로 자국은 남긴다.
      console.warn("[api:payments/webhook] 부분 취소는 원장에 반영되지 않는다", {
        paymentId,
        cancellationId,
      });
    } else {
      console.info("[api:payments/webhook] 취소 확정", { paymentId, type, kind: result.kind });
    }
    return acknowledged();
  }

  return retryIfWorthIt("취소 확정 실패", paymentId, result.response.status);
}

/**
 * 실패를 재전송 지시로 옮긴다.
 *
 * 5xx 는 지금은 못 하지만 나중엔 될 수 있는 경우(포트원 조회 실패 · DB 오류 · 설정 누락 ·
 * 아직 기록되지 않은 결제)고, 409 는 곧 상태가 바뀔 건이다. 그 밖의 실패는 다시 불러도
 * 답이 안 바뀌므로 받아서 끝낸다.
 */
function retryIfWorthIt(label: string, paymentId: string, status: number): Response {
  const retriable = status >= 500 || status === 409;
  console.error(`[api:payments/webhook] ${label}`, { paymentId, status, retriable });
  if (retriable) return fail(503, "webhook_retry", "나중에 다시 시도해주세요.");
  return acknowledged();
}

/**
 * "받았다" 는 응답. 포트원은 2xx 를 받으면 재전송을 멈춘다.
 *
 * 204 가 아니라 200 인 이유는 포트원 예제가 200 을 쓰기 때문이다. 본문은 아무도 읽지
 * 않지만, 콘솔의 웹훅 발송 로그에서 우리 응답을 눈으로 확인할 수 있는 값은 남겨 둔다.
 */
function acknowledged(): Response {
  return ok({ received: true });
}
