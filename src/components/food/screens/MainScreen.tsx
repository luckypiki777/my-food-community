"use client";

import { useMemo, useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { TextField } from "@/design-system/components/TextField";
import { Chip } from "@/design-system/components/Chip";
import { Button } from "@/design-system/components/Button";
import { BottomNavigation } from "@/design-system/components/BottomNavigation";
import { Icon } from "@/design-system/Icon";
import { Empty } from "@/design-system/components/Empty";
import { Spinner } from "@/design-system/components/Spinner";
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
import { PromoBanner } from "../PromoBanner";
import { CATEGORIES, FEATURED } from "../data";
import type { AppNav } from "../types";
import { MAIN_BOTTOM_NAV } from "./navConfig";

export function MainScreen({ nav }: { nav: AppNav }) {
  const [query, setQuery] = useState("");

  // 검색은 이미 불러온 목록 안에서만 한다. 서버 검색은 아직 없다.
  const list = useMemo(() => {
    const q = query.trim();
    if (!q) return nav.places;
    return nav.places.filter(
      (place) => place.title.includes(q) || place.content.includes(q),
    );
  }, [nav.places, query]);

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
          {/* 강연·모임 결제 상품으로 들어가는 입구. 맛집 검색보다 위에 둔다. */}
          <PromoBanner onSelect={nav.openBanner} />

          <TextField
            leftIcon="search"
            placeholder="맛집 이름·설명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <FeaturedHero
            onClick={() => {
              const newest = nav.places[0];
              if (newest) nav.openDetail(String(newest.id));
              else nav.toast("아직 등록된 맛집이 없어요", "info");
            }}
          />

          {/* 카테고리는 아직 DB에 없다. 태그 컬럼이 생기기 전까지는 안내만 한다. */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                selected={c.key === "all"}
                onClick={() =>
                  c.key === "all" ? undefined : nav.toast("카테고리는 준비 중이에요", "info")
                }
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

            <PlaceList nav={nav} list={list} searching={query.trim().length > 0} />
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

function PlaceList({
  nav,
  list,
  searching,
}: {
  nav: AppNav;
  list: AppNav["places"];
  searching: boolean;
}) {
  if (nav.placesStatus === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <Spinner size={28} color="var(--color-background-brand)" />
      </div>
    );
  }

  if (nav.placesStatus === "error") {
    return (
      <Empty
        icon="error"
        title="목록을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
      />
    );
  }

  if (list.length === 0) {
    return searching ? (
      <Empty
        icon="search"
        title="검색 결과가 없어요"
        description="다른 키워드로 찾아보세요"
      />
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Empty
          icon="image"
          title="아직 등록된 맛집이 없어요"
          description="첫 맛집을 등록해 보세요"
        />
        <SeedButton nav={nav} />
      </div>
    );
  }

  return (
    <>
      <CardGrid>
        {list.map((place) => (
          <RestaurantCard
            key={place.id}
            place={place}
            bookmarked={nav.bookmarks.has(String(place.id))}
            onToggleBookmark={nav.toggleBookmark}
            onClick={nav.openDetail}
          />
        ))}
      </CardGrid>

      {/* 검색 중에는 이미 받은 목록만 거르므로 더 불러오기를 감춘다. */}
      {nav.hasMorePlaces && !searching && (
        <Button
          variant="secondary"
          size="md"
          style={{ width: "100%" }}
          disabled={nav.loadingMorePlaces}
          onClick={nav.loadMorePlaces}
        >
          {nav.loadingMorePlaces ? "불러오는 중…" : "더 보기"}
        </Button>
      )}
    </>
  );
}

/**
 * 개발용 시드 버튼. 핸드오프 목업이던 맛집 6개를 실제 DB로 넣는다.
 *
 * 운영 빌드에서는 아예 렌더되지 않는다(`NODE_ENV` 는 빌드 때 상수로 박히므로
 * 이 블록째 번들에서 빠진다). 시드가 필요 없어지면 이 컴포넌트와
 * `src/app/api/dev` 를 같이 지우면 된다.
 */
function SeedButton({ nav }: { nav: AppNav }) {
  const [running, setRunning] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  const seed = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const body = (await res.json().catch(() => null)) as
        | { seeded?: number; failed?: { title: string; reason: string }[] }
        | { error?: { message?: string } }
        | null;

      if (!res.ok) {
        const message = (body as { error?: { message?: string } } | null)?.error?.message;
        nav.toast(message ?? "샘플을 넣지 못했어요", "error");
        return;
      }

      const { seeded = 0, failed = [] } = (body ?? {}) as {
        seeded?: number;
        failed?: { title: string; reason: string }[];
      };

      if (failed.length > 0) {
        console.warn("[seed] 실패한 항목", failed);
        nav.toast(`${seeded}개 넣었어요. ${failed.length}개는 실패했어요`, "info");
      } else {
        nav.toast(`샘플 맛집 ${seeded}개를 넣었어요`, "success");
      }
      nav.reloadPlaces();
    } catch {
      nav.toast("샘플을 넣지 못했어요", "error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="md"
      style={{ width: "100%" }}
      disabled={running}
      onClick={() => void seed()}
    >
      {running ? "넣는 중…" : "샘플 맛집 6개 넣기 (개발용)"}
    </Button>
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
