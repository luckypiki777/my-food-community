"use client";

import { useMemo, useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { TextField } from "@/design-system/components/TextField";
import { Chip } from "@/design-system/components/Chip";
import { BottomNavigation } from "@/design-system/components/BottomNavigation";
import { Icon } from "@/design-system/Icon";
import { Empty } from "@/design-system/components/Empty";
import {
  Screen,
  StickyHeader,
  FixedBottom,
  Container,
  CardGrid,
  SectionHeader,
  Fab,
  LIST_MAX,
} from "../shell";
import { RestaurantCard } from "../RestaurantCard";
import {
  CATEGORIES,
  FEATURED,
  MAIN_LIST_IDS,
  RESTAURANTS,
  type CategoryKey,
} from "../data";
import type { AppNav } from "../types";
import { MAIN_BOTTOM_NAV } from "./navConfig";

export function MainScreen({ nav }: { nav: AppNav }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");

  const list = useMemo(() => {
    const base = MAIN_LIST_IDS.map((id) => RESTAURANTS.find((r) => r.id === id)!);
    return base.filter((r) => {
      const byCat = category === "all" || r.tags.includes(category);
      const q = query.trim();
      const byQuery =
        !q ||
        r.name.includes(q) ||
        r.description.includes(q) ||
        r.meta.includes(q);
      return byCat && byQuery;
    });
  }, [query, category]);

  return (
    <Screen hasBottomBar>
      <StickyHeader maxWidth={LIST_MAX}>
        <TopNavigation
          title="구로 맛집"
          rightIcon="user"
          rightLabel="마이"
          onRightClick={() => nav.navigate("my")}
        />
      </StickyHeader>

      <Container maxWidth={LIST_MAX} style={{ paddingTop: 12, paddingBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <TextField
            leftIcon="search"
            placeholder="맛집 이름·지역 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <FeaturedHero onClick={() => nav.openDetail("guro-boribap")} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                selected={category === c.key}
                onClick={() => setCategory(c.key)}
              />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionHeader
              title="이웃이 찾은 맛집"
              trailing={
                <button
                  type="button"
                  onClick={() => nav.toast("정렬 옵션은 준비 중이에요", "info")}
                  className="text-label-lg"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    border: "none",
                    background: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  최신순
                  <Icon name="chevron-down" size={16} color="var(--color-text-muted)" />
                </button>
              }
            />

            {list.length > 0 ? (
              <CardGrid>
                {list.map((r) => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    bookmarked={nav.bookmarks.has(r.id)}
                    onToggleBookmark={nav.toggleBookmark}
                    onClick={nav.openDetail}
                  />
                ))}
              </CardGrid>
            ) : (
              <Empty
                icon="search"
                title="검색 결과가 없어요"
                description="다른 키워드나 카테고리로 찾아보세요"
              />
            )}
          </div>
        </div>
      </Container>

      <Fab maxWidth={LIST_MAX} onClick={() => nav.navigate("register")} />

      <FixedBottom maxWidth={LIST_MAX}>
        <BottomNavigation
          items={MAIN_BOTTOM_NAV}
          activeKey="home"
          onChange={(key) => handleBottomNav(key, nav)}
        />
      </FixedBottom>
    </Screen>
  );
}

function FeaturedHero({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        height: "clamp(160px, 30vw, 260px)",
        border: "none",
        padding: 0,
        borderRadius: 18,
        overflow: "hidden",
        cursor: "pointer",
        background: "var(--color-background-muted)",
      }}
    >
      <img
        src={FEATURED.image}
        alt={FEATURED.title}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(28,28,30,0) 30%, rgba(28,28,30,0.85) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 12,
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
          {FEATURED.badge}
        </span>
        <span
          className="text-heading-md"
          style={{ color: "var(--color-text-on-inverse)", textAlign: "left" }}
        >
          {FEATURED.title}
        </span>
      </div>
      <span
        className="text-label-md"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          padding: "3px 8px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.35)",
          color: "var(--color-text-on-inverse)",
        }}
      >
        1/{FEATURED.total}
      </span>
    </button>
  );
}

/** Shared bottom-nav routing used by main + my screens. */
export function handleBottomNav(key: string, nav: AppNav) {
  if (key === "home") nav.navigate("main");
  else if (key === "register") nav.navigate("register");
  else if (key === "my") nav.navigate("my");
  else nav.toast("지도는 준비 중이에요", "info");
}
