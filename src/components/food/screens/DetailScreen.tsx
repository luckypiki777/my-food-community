"use client";

import { TopNavigation } from "@/design-system/components/TopNavigation";
import { Chip } from "@/design-system/components/Chip";
import { Button } from "@/design-system/components/Button";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, FixedBottom, Container, READ_MAX, GUTTER } from "../shell";
import type { Restaurant } from "../data";
import type { AppNav } from "../types";

export function DetailScreen({
  restaurant,
  nav,
}: {
  restaurant: Restaurant;
  nav: AppNav;
}) {
  const saved = nav.bookmarks.has(restaurant.id);

  const copyAddress = async () => {
    try {
      await navigator.clipboard?.writeText(restaurant.address);
      nav.toast("주소를 복사했어요", "success");
    } catch {
      nav.toast("주소 복사에 실패했어요", "error");
    }
  };

  return (
    <Screen hasBottomBar>
      <StickyHeader inverse maxWidth={READ_MAX}>
        <TopNavigation
          variant="inverse"
          title="맛집 상세"
          leftIcon="arrow-left"
          onLeftClick={() => nav.navigate("main")}
        />
      </StickyHeader>

      <Container maxWidth={READ_MAX} padded={false}>
        <img
          src={restaurant.image}
          alt={restaurant.name}
          style={{
            display: "block",
            width: "100%",
            height: "clamp(200px, 42vw, 320px)",
            objectFit: "cover",
            background: "var(--color-background-muted)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            padding: `18px ${GUTTER} 24px`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 className="text-heading-lg" style={{ color: "var(--color-text-default)", margin: 0 }}>
              {restaurant.name}
            </h1>
            <span className="text-body-md" style={{ color: "var(--color-text-muted)" }}>
              {restaurant.meta}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {restaurant.info.map((c) => (
              <Chip key={c.label} label={c.label} icon={c.icon} />
            ))}
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="text-heading-sm" style={{ color: "var(--color-text-default)", margin: 0 }}>
              이용 후기
            </h2>
            <p className="text-body-md" style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              {restaurant.review}
            </p>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="text-heading-sm" style={{ color: "var(--color-text-default)", margin: 0 }}>
                주소
              </h2>
              <button
                type="button"
                onClick={copyAddress}
                className="text-label-lg"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  border: "none",
                  background: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                <Icon name="copy" size={16} color="var(--color-text-muted)" />
                복사
              </button>
            </div>
            <span className="text-body-md" style={{ color: "var(--color-text-secondary)" }}>
              {restaurant.address}
            </span>
            <MapPlaceholder />
          </section>
        </div>
      </Container>

      <FixedBottom maxWidth={READ_MAX}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: `12px ${GUTTER} 16px`,
            background: "var(--color-background-surface)",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <Button
            variant="secondary"
            size="lg"
            leftIcon="bookmark"
            onClick={() => {
              nav.toggleBookmark(restaurant.id);
              nav.toast(saved ? "찜을 해제했어요" : "찜 목록에 저장했어요", saved ? "info" : "success");
            }}
          >
            {saved ? "저장됨" : "저장"}
          </Button>
          <Button
            variant="primary"
            size="lg"
            leftIcon="arrow-up"
            style={{ flex: 1 }}
            onClick={() => nav.toast("길찾기는 준비 중이에요", "info")}
          >
            길찾기
          </Button>
        </div>
      </FixedBottom>
    </Screen>
  );
}

/** Stylised static map preview with a brand pin. */
function MapPlaceholder() {
  return (
    <div
      style={{
        position: "relative",
        height: 140,
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--color-background-muted)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "-5%",
          right: "-5%",
          top: "58%",
          height: 12,
          borderRadius: 8,
          background: "var(--color-background-default)",
          transform: "rotate(-4deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "20%",
          right: "10%",
          top: "34%",
          height: 8,
          borderRadius: 8,
          background: "var(--color-border-default)",
          transform: "rotate(6deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 44,
          height: 44,
          borderRadius: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background-brand)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        }}
      >
        <Icon name="map-pin" size={22} color="var(--color-text-on-brand)" />
      </div>
    </div>
  );
}
