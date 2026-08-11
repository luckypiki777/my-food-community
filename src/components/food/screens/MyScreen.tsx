"use client";

import { useState } from "react";

import { TopNavigation } from "@/design-system/components/TopNavigation";
import { Button } from "@/design-system/components/Button";
import { Avatar } from "@/design-system/components/Avatar";
import { BottomNavigation } from "@/design-system/components/BottomNavigation";
import { Badge } from "@/design-system/components/Badge";
import { Empty } from "@/design-system/components/Empty";
import { Spinner } from "@/design-system/components/Spinner";
import {
  Screen,
  StickyHeader,
  FixedBottom,
  Container,
  CardGrid,
  SectionHeader,
  LIST_MAX,
} from "../shell";
import { Modal } from "@/design-system/components/Modal";
import { RestaurantCard } from "../RestaurantCard";
import { ProfileEditModal } from "../ProfileEditModal";
import { deletePlace, usePlaceList, type PlaceSummary } from "../usePlaces";
import type { AppNav } from "../types";
import { MAIN_BOTTOM_NAV } from "./navConfig";
import { handleBottomNav } from "./MainScreen";

export function MyScreen({ nav }: { nav: AppNav }) {
  // 메인의 목록과 따로 부른다. 서버가 작성자로 걸러줘야 뒷 페이지의 내 글이 빠지지 않는다.
  const mine = usePlaceList(Boolean(nav.user), true);
  const [editing, setEditing] = useState(false);
  // 삭제는 되돌리는 UI가 없으니 한 번 물어본다. 서버에서는 소프트 삭제라 복구는 가능하다.
  const [pendingDelete, setPendingDelete] = useState<PlaceSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const result = await deletePlace(pendingDelete.id);
    setDeleting(false);

    if (!result.ok) {
      nav.toast(result.message, "error");
      return;
    }
    setPendingDelete(null);
    nav.toast("맛집을 삭제했어요", "success");
    // 마이의 목록과 메인의 목록은 서로 다른 요청이다. 둘 다 다시 불러야 한다.
    mine.reload();
    nav.reloadPlaces();
  };

  const stats = [
    { value: mine.places.length, label: "작성한 글" },
    { value: nav.bookmarks.size, label: "저장한 곳" },
    {
      value: mine.places.reduce((sum, place) => sum + place.imageCount, 0),
      label: "올린 사진",
    },
  ];

  // 우리 DB의 프로필이 우선이다. 아직 못 불러왔으면 구글 계정 정보로 떨어뜨린다.
  // (구글 계정에 표시 이름이 없는 경우까지 있어 이메일 아이디가 마지막 보루다.)
  const displayName =
    nav.profile?.nickname ?? nav.user?.name ?? nav.user?.email?.split("@")[0] ?? "이웃";
  const avatarUrl = nav.profile?.imageUrl ?? nav.user?.avatarUrl ?? null;

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
            <Avatar src={avatarUrl} size="lg" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span className="text-heading-lg" style={{ color: "var(--color-text-default)" }}>
                {displayName}
              </span>
              {nav.user?.email && (
                <span
                  className="text-body-md"
                  style={{
                    color: "var(--color-text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nav.user.email}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            size="md"
            leftIcon="edit"
            style={{ width: "100%" }}
            // 프로필을 아직 못 불러왔으면 무엇을 수정할지 알 수 없다.
            disabled={!nav.profile}
            onClick={() => setEditing(true)}
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
            {stats.map((s, i) => (
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
                    marginRight: i < stats.length - 1 ? "clamp(16px, 6vw, 48px)" : 0,
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
              trailing={<Badge type="neutral">{mine.places.length}</Badge>}
            />

            {mine.status === "loading" ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <Spinner size={28} color="var(--color-background-brand)" />
              </div>
            ) : mine.status === "error" ? (
              <Empty
                icon="error"
                title="글을 불러오지 못했어요"
                description="잠시 후 다시 시도해 주세요"
              />
            ) : mine.places.length === 0 ? (
              <Empty
                icon="image"
                title="아직 쓴 글이 없어요"
                description="첫 맛집을 등록해 보세요"
              />
            ) : (
              <>
                <CardGrid>
                  {mine.places.map((place) => (
                    <RestaurantCard
                      key={place.id}
                      place={place}
                      onClick={nav.openDetail}
                      onDelete={() => setPendingDelete(place)}
                    />
                  ))}
                </CardGrid>
                {mine.hasMore && (
                  <Button
                    variant="secondary"
                    size="md"
                    style={{ width: "100%" }}
                    disabled={mine.loadingMore}
                    onClick={() => void mine.loadMore()}
                  >
                    {mine.loadingMore ? "불러오는 중…" : "더 보기"}
                  </Button>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={nav.signOut}
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

      <Modal
        open={pendingDelete !== null}
        title="이 맛집을 삭제할까요?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" 이(가) 목록에서 사라져요.`
            : undefined
        }
        onClose={() => (deleting ? undefined : setPendingDelete(null))}
        primaryAction={{
          label: deleting ? "삭제 중…" : "삭제",
          variant: "destructive",
          loading: deleting,
          onClick: () => void confirmDelete(),
        }}
        secondaryAction={{
          label: "취소",
          onClick: () => (deleting ? undefined : setPendingDelete(null)),
        }}
      />

      {/* 열려 있을 때만 마운트한다. 닫으면 고르다 만 사진까지 통째로 사라진다. */}
      {editing && nav.profile && (
        <ProfileEditModal
          profile={nav.profile}
          fallbackImageUrl={nav.user?.avatarUrl ?? null}
          onClose={() => setEditing(false)}
          onSave={async (input) => {
            const result = await nav.saveProfile(input);
            // 실패는 모달이 입력값 옆에 그대로 띄운다. 토스트까지 겹치면 시끄럽다.
            if (result.ok) nav.toast("프로필을 저장했어요", "success");
            return result;
          }}
        />
      )}
    </Screen>
  );
}
