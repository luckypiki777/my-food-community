"use client";

import { useState } from "react";

import { PRODUCT_CATEGORY, formatWon } from "./payments";
import { ProductImage } from "./ProductImage";
import { formatEventDate, useProductList } from "./useProducts";

/** 디자인은 140. 컨테이너가 넓어져도 띠처럼 납작해지지 않게 위로만 조금 자란다. */
const HEIGHT = "clamp(140px, 16vw, 200px)";

/**
 * 메인 상단 배너 — 강연·모임 결제 상품으로 들어가는 입구.
 *
 * 상품은 `product` 테이블에서 온다(`/api/products`). 넘겨 볼 수 있는 자리라 점(dot)을
 * 두지만, 자동으로 넘기지는 않는다. 사용자가 읽는 중에 배너가 바뀌면 방금 누르려던
 * 상품이 아닌 곳으로 들어가게 된다.
 */
export function PromoBanner({ onSelect }: { onSelect: (productId: string) => void }) {
  const { products, status } = useProductList();
  const [index, setIndex] = useState(0);

  // 목록이 줄어들면(운영자가 상품을 내리면) 보고 있던 index 가 범위를 벗어난다.
  const banner = products[Math.min(index, products.length - 1)];

  // 불러오는 동안 같은 높이의 빈 자리를 잡아 둔다. 안 그러면 배너가 도착하는 순간
  // 아래 검색창부터 목록까지 통째로 밀린다.
  if (status === "loading") {
    return (
      <div
        aria-hidden
        style={{
          width: "100%",
          height: HEIGHT,
          borderRadius: 18,
          background: "var(--color-background-muted)",
        }}
      />
    );
  }

  // 팔 상품이 없거나 못 불러왔으면 배너 자리를 통째로 접는다. 맛집을 보러 온 사람에게
  // "배너를 불러오지 못했어요" 는 알려 줄 이유가 없는 실패다.
  if (!banner) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      <button
        type="button"
        onClick={() => onSelect(banner.id)}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          height: HEIGHT,
          padding: 0,
          border: "none",
          borderRadius: 18,
          overflow: "hidden",
          cursor: "pointer",
          background: "var(--color-background-muted)",
        }}
      >
        <ProductImage
          image={banner.bannerImage}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(-90deg, #1C1C1EE6 0%, #1C1C1E26 100%)",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 20,
            top: 22,
            right: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
            textAlign: "left",
          }}
        >
          <span
            className="text-label-md"
            style={{
              padding: "5px 10px",
              borderRadius: 11,
              background: "var(--color-background-brand)",
              color: "var(--color-text-on-brand)",
            }}
          >
            {PRODUCT_CATEGORY}
          </span>
          <span className="text-heading-md" style={{ color: "var(--color-text-on-inverse)" }}>
            {banner.name}
          </span>
          <span className="text-label-md" style={{ color: "var(--color-text-on-inverse)" }}>
            {formatEventDate(banner.eventAt)} · 참가비 {formatWon(banner.price)}
          </span>
        </span>
      </button>

      {/* 한 장뿐이면 점은 아무 것도 알려주지 않는다. */}
      {products.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
          {products.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`${i + 1}번째 배너 보기`}
              aria-current={item.id === banner.id}
              onClick={() => setIndex(i)}
              style={{
                width: item.id === banner.id ? 16 : 6,
                height: 6,
                padding: 0,
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                background:
                  item.id === banner.id
                    ? "var(--color-background-brand)"
                    : "var(--color-border-strong)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
