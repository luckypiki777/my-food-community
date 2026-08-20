import "server-only";

import * as PortOne from "@portone/server-sdk";

/**
 * 포트원 웹훅의 **문 앞**. 서명 검증과 이벤트 분류만 한다.
 *
 * 규칙의 원본은 `rules/payment.md` 다. 결제 판정은 여기 없다 — 검증된 웹훅에서 결제 건
 * ID 하나만 뽑아 `completePayment()`(`payment.ts`)에 넘긴다. 판정 표가 두 벌이 되면
 * 브라우저로 들어온 결제와 웹훅으로 들어온 결제가 서로 다른 기준을 타게 된다.
 *
 * 웹훅 버전은 `2024-04-25`(Standard Webhooks) 기준이다.
 * 문서: https://developers.portone.io/opi/ko/integration/webhook/readme-v2
 */

/** 우리가 실제로 처리하는 이벤트. 결제 승인 하나뿐이다. */
const PAID = "Transaction.Paid";

/**
 * 취소 계열 이벤트. **아직 처리하지 않는다** — `rules/payment.md` 8절.
 *
 * 목록으로 들고 있는 이유는 "모르는 이벤트" 와 갈라서 로그에 남기기 위해서다.
 * 콘솔에서 환불한 건이 우리 원장에 반영되지 않았다는 사실이 로그에 보여야 한다.
 */
const CANCEL_EVENTS = [
  "Transaction.Cancelled",
  "Transaction.PartialCancelled",
  "Transaction.CancelPending",
] as const;

/**
 * 검증을 마친 웹훅이 무엇을 뜻하는지.
 *
 * `ignore` 는 오류가 아니다 — 결제창이 열렸다(`Transaction.Ready`)거나 빌링키 이벤트처럼
 * 우리가 쓰지 않는 알림이 대부분이다. 포트원은 **말없이 새 `type` 을 추가**하므로
 * 모르는 이벤트에 오류를 내면 안 된다. 조용히 200 으로 받아 넘긴다.
 */
export type WebhookEvent =
  | { kind: "paid"; paymentId: string; storeId: string }
  | { kind: "cancel"; paymentId: string; storeId: string; type: string }
  | { kind: "ignore"; type: string };

export type WebhookVerdict =
  | { ok: true; event: WebhookEvent }
  | { ok: false; reason: string };

/**
 * 웹훅 서명 검증.
 *
 * `body` 는 **원문 문자열**이어야 한다. JSON 으로 파싱한 뒤 다시 직렬화하면 키 순서나
 * 공백이 달라져 서명이 깨진다 — 라우트가 `request.text()` 로 받는 이유다.
 *
 * 시그니처는 헤더(`webhook-id` / `webhook-timestamp` / `webhook-signature`)로 온다.
 * SDK 는 평범한 객체를 받으므로 `Headers` 를 풀어서 넘긴다.
 */
export async function verifyWebhook(
  secret: string,
  body: string,
  headers: Headers,
): Promise<WebhookVerdict> {
  let webhook: PortOne.Webhook.Webhook;
  try {
    webhook = await PortOne.Webhook.verify(secret, body, Object.fromEntries(headers));
  } catch (error) {
    if (error instanceof PortOne.Webhook.WebhookVerificationError) {
      return { ok: false, reason: error.reason };
    }
    // 시크릿 형식이 틀렸거나(InvalidInputError) 본문이 JSON 이 아닌 경우.
    console.error("[bff:payment-webhook] 검증 중 오류", error);
    return { ok: false, reason: "INVALID_INPUT" };
  }

  return { ok: true, event: classify(webhook) };
}

/** 검증된 웹훅 → 우리가 아는 이벤트. 모르는 것은 전부 `ignore`. */
function classify(webhook: PortOne.Webhook.Webhook): WebhookEvent {
  // 알 수 없는 type 은 심볼로 온다. 빌링키 이벤트에는 data.paymentId 가 없다.
  const type = typeof webhook.type === "string" ? webhook.type : "unknown";
  if (!("data" in webhook) || !("paymentId" in webhook.data)) {
    return { kind: "ignore", type };
  }

  const { paymentId, storeId } = webhook.data;
  if (type === PAID) return { kind: "paid", paymentId, storeId };
  if ((CANCEL_EVENTS as readonly string[]).includes(type)) {
    return { kind: "cancel", paymentId, storeId, type };
  }
  return { kind: "ignore", type };
}
