import type { NextRequest } from "next/server";

import {
  listPaymentHistory,
  parsePageSize,
  type CancellationEntry,
  type OrderEntry,
} from "@/lib/bff/paymentHistory";
import { fail, ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type PaymentListResponse = {
  orders: OrderEntry[];
  cancellations: CancellationEntry[];
  /** 상한을 넘긴 오래된 결제가 더 있는지. 화면은 이때만 안내 한 줄을 붙인다. */
  hasMore: boolean;
};

/**
 * 내 결제·취소 내역. 마이 화면의 두 탭이 한 번에 받아 간다.
 *
 * `?limit=` (기본 20, 최대 50).
 *
 * **탭이 둘이라고 요청을 둘로 나누지 않는다.** 결제와 취소는 같은 원장에서 오고, 한 건이
 * 취소되면 결제 내역에서 빠져 취소 내역으로 옮겨간다 — 따로 부르면 그 사이에 취소가
 * 끼어들 때 같은 건이 양쪽에 다 보이거나 양쪽에서 다 사라진다.
 *
 * 남의 내역은 애초에 보이지 않는다. `payment` 의 RLS(`payment is readable by its payer`)가
 * 게이트이고, 여기서는 로그인 여부만 확인해 익명 요청을 미리 끊는다.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const viewerId = await getAuthenticatedUserId(supabase);
  if (!viewerId) return unauthorized();

  const limit = parsePageSize(request.nextUrl.searchParams.get("limit"));
  if (!limit.ok) return limit.response;

  const result = await listPaymentHistory(supabase, limit.value);
  if (!result.ok) {
    console.error("[api:payments#GET] 내역 조회 실패", result.error);
    return fail(500, "internal_error", "결제 내역을 불러오지 못했습니다.");
  }

  return ok<PaymentListResponse>(result.history);
}
