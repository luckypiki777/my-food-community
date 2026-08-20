"use client";

import { Fragment, useState } from "react";

import { TopNavigation } from "@/design-system/components/TopNavigation";
import { Button } from "@/design-system/components/Button";
import { Avatar } from "@/design-system/components/Avatar";
import { BottomNavigation } from "@/design-system/components/BottomNavigation";
import { TabNavigation } from "@/design-system/components/TabNavigation";
import { Empty } from "@/design-system/components/Empty";
import { Spinner } from "@/design-system/components/Spinner";
import { Screen, StickyHeader, FixedBottom, Container, CardGrid, LIST_MAX } from "../shell";
import { Modal } from "@/design-system/components/Modal";
import { RestaurantCard } from "../RestaurantCard";
import { OrderCard, CancellationCard } from "../OrderCard";
import { ProfileEditModal } from "../ProfileEditModal";
import { formatWon, type Order } from "../payments";
import { deletePlace, usePlaceList, type LoadStatus, type PlaceSummary } from "../usePlaces";
import type { AppNav, MyTabKey } from "../types";
import { MAIN_BOTTOM_NAV } from "./navConfig";
import { handleBottomNav } from "./MainScreen";

const TABS: { key: MyTabKey; label: string }[] = [
  { key: "posts", label: "내가 쓴 글" },
  { key: "orders", label: "결제 내역" },
  { key: "cancels", label: "취소 내역" },
];

export function MyScreen({ nav }: { nav: AppNav }) {
  // 메인의 목록과 따로 부른다. 서버가 작성자로 걸러줘야 뒷 페이지의 내 글이 빠지지 않는다.
  const mine = usePlaceList(Boolean(nav.user), true);
  const [editing, setEditing] = useState(false);
  // 삭제는 되돌리는 UI가 없으니 한 번 물어본다. 서버에서는 소프트 삭제라 복구는 가능하다.
  const [pendingDelete, setPendingDelete] = useState<PlaceSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 결제 취소도 되돌릴 수 없다. 환불 금액까지 보여주고 확인을 받는다.
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null);
  // 포트원 취소는 서버 왕복이라 시간이 걸린다. 그동안 모달을 닫지도 다시 누르지도 못한다.
  const [cancelling, setCancelling] = useState(false);

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

  const confirmCancel = async () => {
    if (!pendingCancel || cancelling) return;
    setCancelling(true);
    const result = await nav.cancelOrder(pendingCancel.id);
    setCancelling(false);

    if (!result.ok) {
      // 실패 이유는 서버가 준 문구를 그대로 보여준다(취소 기한이 지났다 · 이미 취소됐다 등).
      nav.toast(result.message, "error");
      return;
    }
    setPendingCancel(null);
    // 취소한 건은 이 탭에서 사라지므로, 어디로 갔는지 알려주고 그 탭을 연다.
    nav.openMyTab("cancels");
    nav.toast("결제를 취소했어요. 환불이 시작됩니다", "success");
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

  /** 프로필 설정을 연다. 아직 못 불러왔으면 무엇을 고칠지 알 수 없어 막는다. */
  const openProfileSettings = () => {
    if (!nav.profile) {
      nav.toast("프로필을 불러오는 중이에요", "info");
      return;
    }
    setEditing(true);
  };

  return (
    <Screen hasBottomBar>
      <StickyHeader maxWidth={LIST_MAX}>
        <TopNavigation
          title="마이"
          rightIcon="settings"
          rightLabel="프로필 설정"
          onRightClick={openProfileSettings}
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
            onClick={openProfileSettings}
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
              <Fragment key={s.label}>
                {i > 0 && (
                  <div
                    style={{
                      width: 1,
                      height: 32,
                      flexShrink: 0,
                      background: "var(--color-border-default)",
                    }}
                  />
                )}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <span className="text-heading-md" style={{ color: "var(--color-text-brand)" }}>
                    {s.value}
                  </span>
                  <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
                    {s.label}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>

          <TabNavigation
            tabs={TABS}
            activeKey={nav.myTab}
            onChange={(key) => nav.openMyTab(key as MyTabKey)}
            fullWidth
          />

          {nav.myTab === "posts" && (
            <MyPosts mine={mine} nav={nav} onDelete={setPendingDelete} />
          )}
          {nav.myTab === "orders" && <MyOrders nav={nav} onCancel={setPendingCancel} />}
          {nav.myTab === "cancels" && <MyCancellations nav={nav} />}

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

      <Modal
        open={pendingCancel !== null}
        title="결제를 취소할까요?"
        description={
          pendingCancel
            ? `"${pendingCancel.productName}" 신청이 취소되고 ${formatWon(pendingCancel.amount)}이 환불돼요.`
            : undefined
        }
        onClose={() => (cancelling ? undefined : setPendingCancel(null))}
        primaryAction={{
          label: cancelling ? "취소 중…" : "결제 취소",
          variant: "destructive",
          loading: cancelling,
          onClick: () => void confirmCancel(),
        }}
        secondaryAction={{
          label: "닫기",
          onClick: () => (cancelling ? undefined : setPendingCancel(null)),
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

function MyPosts({
  mine,
  nav,
  onDelete,
}: {
  mine: ReturnType<typeof usePlaceList>;
  nav: AppNav;
  onDelete: (place: PlaceSummary) => void;
}) {
  if (mine.status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
        <Spinner size={28} color="var(--color-background-brand)" />
      </div>
    );
  }

  if (mine.status === "error") {
    return (
      <Empty
        icon="error"
        title="글을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
      />
    );
  }

  if (mine.places.length === 0) {
    return (
      <Empty icon="image" title="아직 쓴 글이 없어요" description="첫 맛집을 등록해 보세요" />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CardGrid>
        {mine.places.map((place) => (
          <RestaurantCard
            key={place.id}
            place={place}
            onClick={nav.openDetail}
            onDelete={() => onDelete(place)}
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
    </div>
  );
}

/** 목록을 아직 못 읽었을 때. 결제 내역과 취소 내역이 같은 요청을 기다린다. */
function PaymentsPlaceholder({ status }: { status: LoadStatus }) {
  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
        <Spinner size={28} color="var(--color-background-brand)" />
      </div>
    );
  }
  return (
    <Empty
      icon="error"
      title="결제 내역을 불러오지 못했어요"
      description="잠시 후 다시 시도해 주세요"
    />
  );
}

/**
 * 상한을 넘긴 결제가 더 있을 때의 안내.
 *
 * 조용히 잘라 놓으면 "예전 결제가 사라졌다" 로 읽힌다. 넘길 수단이 아직 없으니
 * 잘렸다는 사실만이라도 말해 준다(`rules/payment.md` 9-4).
 */
function TruncatedNote() {
  return (
    <span
      className="text-label-md"
      style={{ color: "var(--color-text-muted)", textAlign: "center" }}
    >
      최근 결제부터 보여드리고 있어요
    </span>
  );
}

function MyOrders({ nav, onCancel }: { nav: AppNav; onCancel: (order: Order) => void }) {
  if (nav.paymentsStatus !== "ready") {
    return <PaymentsPlaceholder status={nav.paymentsStatus} />;
  }

  if (nav.orders.length === 0) {
    return (
      <Empty
        icon="calendar"
        title="결제한 모임이 없어요"
        description="메인 배너에서 강연·모임을 둘러보세요"
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CardGrid>
        {nav.orders.map((order) => (
          <OrderCard key={order.id} order={order} onCancel={onCancel} />
        ))}
      </CardGrid>
      {nav.paymentsHasMore && <TruncatedNote />}
    </div>
  );
}

function MyCancellations({ nav }: { nav: AppNav }) {
  if (nav.paymentsStatus !== "ready") {
    return <PaymentsPlaceholder status={nav.paymentsStatus} />;
  }

  if (nav.cancellations.length === 0) {
    return (
      <Empty
        icon="info"
        title="취소한 내역이 없어요"
        description="결제 내역에서 취소하면 여기에 쌓여요"
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CardGrid>
        {nav.cancellations.map((cancellation) => (
          <CancellationCard key={cancellation.id} cancellation={cancellation} />
        ))}
      </CardGrid>
      {nav.paymentsHasMore && <TruncatedNote />}
    </div>
  );
}
