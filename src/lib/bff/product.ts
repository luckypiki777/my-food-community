import "server-only";

import { badRequest, fail, invalid, type Parsed } from "@/lib/bff/response";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { productImageUrl } from "@/lib/supabase/storage";

/**
 * 상품(강연·모임) 라우트가 공유하는 검증 · 조회 · 응답 조립.
 *
 * 맛집(`place.ts`)과 달리 쓰기가 없다. 상품은 운영자가 대시보드로 넣는 자산이고
 * 앱에는 목록·상세 조회만 있다. 그래서 파일이 훨씬 얇다.
 */

/** 목록·상세에 나오는 판매 상태. RLS 정책 `product is readable...` 과 같은 값이다. */
export const PUBLIC_STATUS = "Public";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/** 배너가 쓰는 컬럼만. 설명과 상세 사진은 상세에서만 읽는다. */
export const PRODUCT_SUMMARY_COLUMNS =
  "id, name, event_at, address, capacity, price, status, image_path_main_lg, image_path_main_md" as const;

/** 상세는 위에 더해 본문과 상세 사진까지. */
export const PRODUCT_DETAIL_COLUMNS =
  "id, name, event_at, address, capacity, price, status, image_path_main_lg, image_path_main_md, description, image_path_detail_lg, image_path_detail_md" as const;

/**
 * 한 장의 사진을 두 벌로 내려준다. 크기만 다른 게 아니라 **크롭이 다른** 사진이라
 * (배너 lg 2048×768 · md 1829×860) 화면이 뷰포트에 맞는 쪽을 고른다.
 *
 * 두 값 모두 앞단(스토리지 주소 + 버킷)은 `SUPABASE_STORAGE_URL` 환경변수에서,
 * 뒷단(파일 경로)은 DB 의 `image_path_*` 컬럼에서 온다. 브라우저는 스토리지 주소를 모른다.
 */
export type ResponsiveImage = {
  /** 데스크톱용 와이드 크롭. */
  lg: string;
  /** 모바일 · 태블릿용 크롭. */
  md: string;
};

function toResponsiveImage(lgPath: string, mdPath: string): ResponsiveImage {
  return { lg: productImageUrl(lgPath), md: productImageUrl(mdPath) };
}

export type ProductSummaryRow = {
  id: string;
  name: string;
  event_at: string;
  address: string;
  capacity: number;
  price: number;
  status: string;
  image_path_main_lg: string;
  image_path_main_md: string;
};

export type ProductDetailRow = ProductSummaryRow & {
  description: string;
  image_path_detail_lg: string;
  image_path_detail_md: string;
};

type ProductBase = {
  id: string;
  name: string;
  /** 행사 일시. ISO 문자열 그대로 준다 — 사람이 읽는 표기는 화면이 만든다. */
  eventAt: string;
  /** 행사 장소. */
  address: string;
  /** 정원(명). */
  capacity: number;
  price: number;
  /** `status` 가 'Public' 인지. 화면이 문자열을 다시 해석하지 않게 미리 풀어 준다. */
  onSale: boolean;
  /** 메인 배너 사진. */
  bannerImage: ResponsiveImage;
};

/** 목록용. 배너 한 장이 그리는 데 필요한 것만 담는다. */
export type ProductSummary = ProductBase;

/** 상세용. 본문과 상세 사진이 더 붙는다. */
export type ProductDetail = ProductBase & {
  description: string;
  detailImage: ResponsiveImage;
};

export function notFoundProduct(): Response {
  return fail(404, "not_found", "상품을 찾을 수 없습니다.");
}

/** uuid v1~v5 공통 형태. 버전 자리는 굳이 좁히지 않는다. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 경로 파라미터의 id. `product.id` 는 uuid 라 형태부터 본다.
 *
 * 형태가 틀리면 DB 까지 갈 필요가 없다. 그냥 넘기면 PostgREST 가 `22P02`(잘못된 문법)로
 * 돌려주는데, 이 코드는 `fromSupabaseError` 의 표에 없어서 400 이어야 할 요청이
 * 500 으로 떨어진다.
 */
export function parseProductId(raw: string): Parsed<string> {
  if (!UUID_PATTERN.test(raw)) {
    return invalid(badRequest("상품 id 가 올바르지 않습니다.", "invalid_product_id"));
  }
  return { ok: true, value: raw };
}

export function parsePageSize(raw: string | null): Parsed<number> {
  if (raw === null || raw === "") return { ok: true, value: DEFAULT_PAGE_SIZE };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_PAGE_SIZE) {
    return invalid(badRequest(`limit 은 1~${MAX_PAGE_SIZE} 사이여야 합니다.`, "invalid_limit"));
  }
  return { ok: true, value };
}

/**
 * 판매 중인 상품만 고르는 기본 조회.
 *
 * RLS 정책도 같은 조건을 걸고 있어서 이게 없어도 준비 중인 상품이 새어나가지는 않는다.
 * 그래도 쿼리에 남겨 두는 이유는 `selectActivePlaces` 의 `deleted_at` 과 같다 —
 * 쿼리만 읽고도 무엇이 빠지는지 알 수 있어야 한다. 둘은 항상 같은 값이어야 한다.
 */
export function selectPublicProducts(supabase: SupabaseServerClient) {
  return supabase.from("product").select(PRODUCT_SUMMARY_COLUMNS).eq("status", PUBLIC_STATUS);
}

/** 상세 한 건. 컬럼만 다르고 조건은 위와 같다. */
export function selectPublicProductDetail(supabase: SupabaseServerClient) {
  return supabase.from("product").select(PRODUCT_DETAIL_COLUMNS).eq("status", PUBLIC_STATUS);
}

function toProductBase(row: ProductSummaryRow): ProductBase {
  return {
    id: row.id,
    name: row.name,
    eventAt: row.event_at,
    address: row.address,
    capacity: row.capacity,
    // price 는 numeric 이다. 드라이버에 따라 문자열로 실려 오는 값이라 여기서 숫자로 못박는다 —
    // 화면의 금액 표기가 toLocaleString 을 타는데, 문자열이면 자릿점 없이 그대로 찍힌다.
    price: Number(row.price),
    onSale: row.status === PUBLIC_STATUS,
    bannerImage: toResponsiveImage(row.image_path_main_lg, row.image_path_main_md),
  };
}

export function toProductSummary(row: ProductSummaryRow): ProductSummary {
  return toProductBase(row);
}

export function toProductDetail(row: ProductDetailRow): ProductDetail {
  return {
    ...toProductBase(row),
    description: row.description,
    detailImage: toResponsiveImage(row.image_path_detail_lg, row.image_path_detail_md),
  };
}
