"use client";

import type { CSSProperties } from "react";

import type { ResponsiveImage } from "./useProducts";

/**
 * lg(데스크톱)와 md(모바일 · 태블릿)를 가르는 지점.
 *
 * 리스트 화면의 컨테이너 최대 폭(`LIST_MAX`)과 같은 값이다 — 뷰포트가 우리가 그리는
 * 가장 넓은 본문만큼 넓어졌을 때가 "데스크톱" 이라고 보는 게 가장 덜 임의적이다.
 *
 * 흔한 1024 가 아니라 1280 인 이유는 태블릿이 md 를 받아야 하기 때문이다.
 * 아이패드 프로 세로가 정확히 1024라, 1024로 자르면 태블릿이 데스크톱 크롭을 받는다.
 */
export const DESKTOP_MIN_WIDTH = 1280;

/**
 * 상품 사진 한 장. lg / md 중 뷰포트에 맞는 쪽을 브라우저가 고른다.
 *
 * `srcset` + `sizes` 가 아니라 `<picture>` + 미디어 쿼리인 이유는 두 파일이 **비율이 다른
 * 크롭**이기 때문이다(배너 lg 2048×768 · md 1829×860). `srcset` 은 "같은 그림의 다른 해상도"
 * 를 전제로 브라우저가 알아서 고르는 장치라, 화면비에 따라 그림 자체를 바꾸려면
 * `<picture>` 로 지정해야 한다.
 *
 * 고른 쪽 한 장만 내려받는다. 두 벌을 다 받는 게 아니다.
 */
export function ProductImage({
  image,
  alt,
  style,
}: {
  image: ResponsiveImage;
  /** 장식용 사진이면 빈 문자열. */
  alt: string;
  style?: CSSProperties;
}) {
  return (
    // display:contents — <picture> 가 레이아웃 상자를 만들지 않게 한다.
    // 안 그러면 인라인 요소라 배너처럼 img 를 절대배치한 자리에서 빈 줄상자가 생긴다.
    <picture style={{ display: "contents" }}>
      <source media={`(min-width: ${DESKTOP_MIN_WIDTH}px)`} srcSet={image.lg} />
      <img src={image.md} alt={alt} style={style} />
    </picture>
  );
}
