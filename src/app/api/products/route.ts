import type { NextRequest } from "next/server";

import {
  parsePageSize,
  selectPublicProducts,
  toProductSummary,
  type ProductSummary,
} from "@/lib/bff/product";
import { fromSupabaseError, ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type ProductListResponse = { products: ProductSummary[] };

/**
 * 상품 목록. 메인 상단 배너가 쓴다.
 *
 * `?limit=` (기본 20, 최대 50).
 *
 * 맛집 목록과 달리 커서가 없다. `product.id` 는 uuid 라 정렬 기준이 못 되고
 * (uuid v4 는 순서에 아무 의미가 없다), 목록 자체가 운영자가 손으로 올리는
 * 배너 몇 장짜리라 페이지를 넘길 일이 없다. 필요해지면 `event_at + id` 로 커서를 짠다.
 *
 * 정렬은 다가오는 행사 순(`event_at` 오름차순)이다. 지난 행사를 날짜로 걸러내지는 않는다 —
 * 무엇을 내릴지는 운영자가 `status` 로 정한다.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  // 배너는 로그인한 뒤 메인 화면에만 있다. RLS 도 authenticated 만 읽게 열어 뒀다.
  const viewerId = await getAuthenticatedUserId(supabase);
  if (!viewerId) return unauthorized();

  const limit = parsePageSize(request.nextUrl.searchParams.get("limit"));
  if (!limit.ok) return limit.response;

  const { data, error } = await selectPublicProducts(supabase)
    .order("event_at", { ascending: true })
    .limit(limit.value);

  if (error) return fromSupabaseError(error, "products#GET");

  return ok<ProductListResponse>({ products: data.map(toProductSummary) });
}
