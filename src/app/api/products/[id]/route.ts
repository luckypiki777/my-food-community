import type { NextRequest } from "next/server";

import {
  notFoundProduct,
  parseProductId,
  selectPublicProductDetail,
  toProductDetail,
  type ProductDetail,
} from "@/lib/bff/product";
import { fromSupabaseError, ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type ProductDetailResponse = { product: ProductDetail };

type RouteContext = { params: Promise<{ id: string }> };

/**
 * 상품 상세.
 *
 * 판매 중이 아닌 상품은 목록에서 빠지는 것으로 끝나지 않고 상세로도 열리지 않는다.
 * 조건은 `selectPublicProductDetail` 한 곳에 있다.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const viewerId = await getAuthenticatedUserId(supabase);
  if (!viewerId) return unauthorized();

  const id = parseProductId((await params).id);
  if (!id.ok) return id.response;

  const { data, error } = await selectPublicProductDetail(supabase)
    .eq("id", id.value)
    .maybeSingle();

  if (error) return fromSupabaseError(error, "products/[id]#GET");
  if (!data) return notFoundProduct();

  return ok<ProductDetailResponse>({ product: toProductDetail(data) });
}
