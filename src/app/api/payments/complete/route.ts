import type { NextRequest } from "next/server";

import { completePayment, parsePaymentId, type PaymentReceipt } from "@/lib/bff/payment";
import { badRequest, ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type PaymentCompleteResponse = { receipt: PaymentReceipt };

/**
 * 결제 완료 처리.
 *
 * 브라우저는 결제 건 ID 하나만 보낸다. 성공 여부도 금액도 여기서 포트원 서버에
 * 다시 물어본다 — 인증 결제는 금액이 브라우저를 거쳐 가므로 그 말을 믿으면
 * 위변조를 막을 수 없다.
 *
 * **멱등하다.** PC 는 `requestPayment()` 반환값을 받고 모바일은 `redirectUrl` 로 돌아와
 * 부르는데, 사용자가 새로고침하면 또 온다. 이미 기록한 건이면 저장된 스냅샷에서
 * 같은 영수증을 돌려준다.
 *
 * 웹훅(`/api/payments/webhook`)도 같은 `completePayment()` 로 모인다. 둘은 서로의
 * 안전망이라 먼저 도착한 쪽이 기록하고, 나중 것은 저장된 스냅샷을 그대로 돌려받는다.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const viewerId = await getAuthenticatedUserId(supabase);
  if (!viewerId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("요청 본문을 읽지 못했습니다.");
  }

  const paymentId = parsePaymentId((body as { paymentId?: unknown } | null)?.paymentId);
  if (!paymentId.ok) return paymentId.response;

  const result = await completePayment(
    supabase,
    { kind: "session", viewerId },
    paymentId.value,
  );
  if (!result.ok) return result.response;

  return ok<PaymentCompleteResponse>({ receipt: result.receipt });
}
