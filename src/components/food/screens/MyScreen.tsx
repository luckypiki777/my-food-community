"use client";

import { TopNavigation } from "@/design-system/components/TopNavigation";
import { Button } from "@/design-system/components/Button";
import { BottomNavigation } from "@/design-system/components/BottomNavigation";
import { Badge } from "@/design-system/components/Badge";
import {
  Screen,
  StickyHeader,
  FixedBottom,
  Container,
  CardGrid,
  SectionHeader,
  LIST_MAX,
} from "../shell";
import { RestaurantCard } from "../RestaurantCard";
import { MY_POST_IDS, PROFILE, RESTAURANTS } from "../data";
import type { AppNav } from "../types";
import { MAIN_BOTTOM_NAV } from "./navConfig";
import { handleBottomNav } from "./MainScreen";

export function MyScreen({ nav }: { nav: AppNav }) {
  const posts = MY_POST_IDS.map((id) => RESTAURANTS.find((r) => r.id === id)!);

  return (
    <Screen hasBottomBar>
      <StickyHeader maxWidth={LIST_MAX}>
        <TopNavigation
          title="마이"
          rightIcon="settings"
          rightLabel="설정"
          onRightClick={() => nav.toast("설정은 준비 중이에요", "info")}
        />
      </StickyHeader>

      <Container maxWidth={LIST_MAX} style={{ paddingTop: 20, paddingBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={PROFILE.avatar}
              alt={PROFILE.nickname}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                objectFit: "cover",
                flexShrink: 0,
                background: "var(--color-background-muted)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span className="text-heading-lg" style={{ color: "var(--color-text-default)" }}>
                {PROFILE.nickname}
              </span>
              <span className="text-body-md" style={{ color: "var(--color-text-muted)" }}>
                {PROFILE.email}
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="md"
            leftIcon="edit"
            style={{ width: "100%" }}
            onClick={() => nav.toast("프로필 수정은 준비 중이에요", "info")}
          >
            프로필 수정
          </Button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "16px 0",
              borderRadius: 14,
              background: "var(--color-background-subtle)",
            }}
          >
            {PROFILE.stats.map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div
                    style={{
                      width: 1,
                      height: 32,
                      background: "var(--color-border-default)",
                      marginRight: "clamp(16px, 6vw, 48px)",
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    marginRight: i < PROFILE.stats.length - 1 ? "clamp(16px, 6vw, 48px)" : 0,
                  }}
                >
                  <span className="text-heading-md" style={{ color: "var(--color-text-brand)" }}>
                    {s.value}
                  </span>
                  <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionHeader
              title="내가 쓴 글"
              trailing={<Badge type="neutral">{PROFILE.stats[0].value}</Badge>}
            />
            <CardGrid>
              {posts.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  bookmarked={nav.bookmarks.has(r.id)}
                  onToggleBookmark={nav.toggleBookmark}
                  onClick={nav.openDetail}
                />
              ))}
            </CardGrid>
          </div>

          <button
            type="button"
            onClick={() => nav.navigate("login")}
            className="text-label-lg"
            style={{
              alignSelf: "center",
              marginTop: 4,
              padding: "8px 12px",
              border: "none",
              background: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </div>
      </Container>

      <FixedBottom maxWidth={LIST_MAX}>
        <BottomNavigation
          items={MAIN_BOTTOM_NAV}
          activeKey="my"
          onChange={(key) => handleBottomNav(key, nav)}
        />
      </FixedBottom>
    </Screen>
  );
}
