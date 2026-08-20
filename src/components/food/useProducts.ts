"use client";

import { useEffect, useState } from "react";

import type { LoadStatus } from "./usePlaces";

/**
 * 상품(강연·모임) 데이터를 BFF에서 가져온다.
 *
 * CLAUDE.md 규약대로 브라우저는 Supabase를 직접 부르지 않는다. 사진 주소도 마찬가지다 —
 * 스토리지 앞단 주소는 서버의 `SUPABASE_STORAGE_URL` 에만 있고, 여기서는 조립이 끝난
 * 공개 URL만 받아 쓴다.
 *
 * 조회 전용이다. 상품 등록·수정은 앱에 없다(운영자가 대시보드로 넣는다).
 */

export type { LoadStatus };

/**
 * 같은 사진의 두 크롭. 크기만 다른 게 아니라 비율이 달라서
 * `srcset` 이 아니라 `<picture>` + 미디어 쿼리로 고른다(`ProductImage`).
 */
export type ResponsiveImage = {
  /** 데스크톱용 와이드 크롭. */
  lg: string;
  /** 모바일 · 태블릿용 크롭. */
  md: string;
};

export type ProductSummary = {
  id: string;
  name: string;
  /** ISO 문자열. 표기는 아래 `formatEventAt` 이 만든다. */
  eventAt: string;
  address: string;
  capacity: number;
  price: number;
  /** 판매 중인지. 서버가 `status` 를 풀어서 준다. */
  onSale: boolean;
  bannerImage: ResponsiveImage;
};

export type ProductDetail = ProductSummary & {
  description: string;
  detailImage: ResponsiveImage;
};

/**
 * 상품 목록. 메인 배너가 쓴다.
 *
 * `usePlaceList` 와 달리 로그인 여부를 받지 않는다. 이 훅을 부르는 배너는 메인 화면
 * 안에만 있고, 메인 화면 자체가 로그인한 뒤에야 그려지기 때문이다 —
 * 로그아웃하면 컴포넌트째로 사라지므로 비울 상태도 남지 않는다.
 */
export function useProductList() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    // 언마운트 후 setState 를 막는다. StrictMode 이중 실행에서도 안전하다.
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error(`products responded ${res.status}`);
        const body = (await res.json()) as { products: ProductSummary[] };
        if (cancelled) return;
        setProducts(body.products);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, status };
}

/** 상품 상세. `id` 가 null 이면 아무것도 부르지 않는다. */
export function useProductDetail(id: string | null) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [lastId, setLastId] = useState(id);

  // 다른 상품으로 넘어가는 순간 이전 상품 내용을 비운다.
  if (lastId !== id) {
    setLastId(id);
    setProduct(null);
    setStatus("loading");
  }

  useEffect(() => {
    if (id === null) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`product responded ${res.status}`);
        const body = (await res.json()) as { product: ProductDetail };
        if (cancelled) return;
        setProduct(body.product);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { product, status };
}

/**
 * 행사 시각은 한국 시간으로 고정해 보여준다.
 *
 * 구로에서 열리는 모임이라 보는 사람의 시간대를 따라가면 안 된다 —
 * 해외에서 열어 본 참가자에게 엉뚱한 시각이 뜬다.
 */
const EVENT_TIME_ZONE = "Asia/Seoul";

/** "8월 28일 (금) 오후 12시" — 상세 정보 카드의 일시 줄. */
export function formatEventAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // 정각이면 분을 떼고 "오후 12시" 로 쓴다. KST 는 정각 오프셋(+9:00)이라
  // 분은 UTC 와 같은 값이다.
  const onTheHour = date.getUTCMinutes() === 0;
  return date.toLocaleString("ko-KR", {
    timeZone: EVENT_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    ...(onTheHour ? {} : { minute: "2-digit" }),
  });
}

/** "8월 28일 (금)" — 배너 부제와 결제 시트의 짧은 일정 줄. */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    timeZone: EVENT_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
