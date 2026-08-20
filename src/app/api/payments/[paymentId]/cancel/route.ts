import type { NextRequest } from "next/server";

import { parsePaymentId } from "@/lib/bff/payment";
import { cancelPayment } from "@/lib/bff/paymentCancel";
import type { CancellationEntry } from "@/lib/bff/paymentHistory";
import { ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type PaymentCancelResponse = { cancellation: CancellationEntry };

type RouteContext = { params: Promise<{ paymentId: string }> };

/**
 * 결제 취소(구매자 요청).
 *
 * **브라우저는 포트원 취소 API 를 부르지 않는다.** 그 호출에는 `PORTONE_API_SECRET` 이
 * 필요하고, 그 값 하나면 남의 결제까지 취소할 수 있다. 다른 라우트와 같은 규약대로
 * 시크릿이 필요한 호출은 전부 BFF 가 서버에서 한다.
 *
 * 권한은 **RLS 가** 판정한다. 원 결제 행을 세션 클라이언트로 읽으므로 남의 결제 건
 * ID 를 넣으면 행이 보이지 않고 404 로 끝난다.
 *
 * **멱등하다.** 이미 취소한 건이면 포트원을 다시 부르지 않고 원장의 취소 행을 그대로
 * 돌려준다 — 중복 클릭이나 새로고침에도 취소가 두 번 일어나지 않는다.
 *
 * 취소가 끝나면 포트원이 `Transaction.Cancelled` 웹훅을 한 번 더 보낸다. 그 경로도
 * `recordCancellation()` 로 모이므로 먼저 도착한 쪽이 기록하고 나중 것은 그대로 돌아간다.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const viewerId = await getAuthenticatedUserId(supabase);
  if (!viewerId) return unauthorized();

  const paymentId = parsePaymentId((await params).paymentId);
  if (!paymentId.ok) return paymentId.response;

  const result = await cancelPayment(supabase, paymentId.value);
  if (!result.ok) return result.response;

  console.info("[api:payments/[paymentId]/cancel] 결제 취소", {
    paymentId: paymentId.value,
    alreadyCancelled: result.alreadyCancelled,
  });

  return ok<PaymentCancelResponse>({ cancellation: result.cancellation });
}
