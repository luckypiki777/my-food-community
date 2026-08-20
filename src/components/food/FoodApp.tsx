"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast, type ToastType } from "@/design-system/components/Toast";
import { Spinner } from "@/design-system/components/Spinner";
import { MainScreen } from "./screens/MainScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { MyScreen } from "./screens/MyScreen";
import { BannerDetailScreen } from "./screens/BannerDetailScreen";
import { PaymentCompleteScreen } from "./screens/PaymentCompleteScreen";
import { authErrorMessage, useSession } from "./useSession";
import { useProfile } from "./useProfile";
import { usePlaceList } from "./usePlaces";
import {
  CANCELLATIONS,
  ORDERS,
  cancellationFromOrder,
  orderFromReceipt,
  type Cancellation,
  type Order,
  type Receipt,
} from "./payments";
import { completePayment as confirmPayment, receiptFrom } from "./usePayments";
import type { AppNav, MyTabKey, ScreenKey } from "./types";

type ToastState = { id: number; message: string; type: ToastType };

/** 화면 사이를 오갈 때 쓰는 맛집 id. DB 는 숫자, 화면 상태(찜 등)는 문자열 키를 쓴다. */
function toPlaceId(value: string | null): number | null {
  if (value === null) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function FoodApp() {
  const { session, signOut } = useSession();
  const authenticated = session.status === "authenticated";
  const { profile, saveProfile } = useProfile(authenticated);
  // 객체째로 쓰면 렌더마다 새 참조라 아래 nav 의 useMemo 가 매번 다시 만들어진다.
  const {
    places,
    status: placesStatus,
    reload: reloadPlaces,
    loadMore,
    loadingMore: loadingMorePlaces,
    hasMore: hasMorePlaces,
  } = usePlaceList(authenticated);
  const [screen, setScreen] = useState<ScreenKey>("login");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastSeq = useRef(0);
  // 강연·모임 결제. 결제 자체는 포트원 + `payment` 테이블로 배선돼 있고
  // (`rules/payment.md`), 여기 남은 내역·취소만 아직 화면 상태로 흐른다
  // (`payments.ts` 의 고정값이 시작점이다).
  const [productId, setProductId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [cancellations, setCancellations] = useState<Cancellation[]>(CANCELLATIONS);
  const [myTab, setMyTab] = useState<MyTabKey>("posts");
  // 결제창에서 리다이렉트로 돌아온 직후. 결과를 확인하는 동안 화면을 잠근다.
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ id: (toastSeq.current += 1), message, type });
  }, []);

  // 화면은 로그인 상태에서 파생된다. state 로 따로 들고 effect 로 맞추면
  // 잘못된 화면이 한 프레임 먼저 그려진다.
  const activeScreen: ScreenKey = authenticated ? (screen === "login" ? "main" : screen) : "login";

  // Reset scroll on every screen/selection change (single-page demo navigation).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeScreen, selectedId]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // /api/auth/callback 이 결과를 `?welcome=` / `?auth_error=` 로 붙여 돌려보낸다.
  // 토스트로 알린 뒤 주소창에서 지워, 새로고침해도 다시 뜨지 않게 한다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("auth_error");
    const welcomed = params.has("welcome");
    if (!errorCode && !welcomed) return;

    if (errorCode) showToast(authErrorMessage(errorCode), "error");
    else showToast("환영해요! 구로 맛집을 시작합니다", "success");

    params.delete("auth_error");
    params.delete("welcome");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [showToast]);

  const handleSignOut = useCallback(async () => {
    if (!(await signOut())) {
      showToast("로그아웃하지 못했어요. 다시 시도해 주세요.", "error");
      return;
    }
    // 다음 로그인 때 이전 사용자가 보던 화면으로 돌아가지 않도록 초기화한다.
    setScreen("login");
    setBookmarks(new Set());
    setMyTab("posts");
    setReceipt(null);
    // 결제·취소 내역도 화면 상태다. 안 지우면 다음 사람이 남의 내역을 본다.
    setOrders(ORDERS);
    setCancellations(CANCELLATIONS);
    showToast("로그아웃했어요", "info");
  }, [signOut, showToast]);

  const completePayment = useCallback((next: Receipt) => {
    setReceipt(next);
    // 방금 결제한 건이 결제 내역 맨 위에 보여야 "결제 내역 보기" 가 말이 된다.
    setOrders((prev) => [orderFromReceipt(next, new Date()), ...prev]);
    setScreen("payment-complete");
  }, []);

  // 결제창에서 돌아온 길(모바일). `/payment/complete` 가 포트원의 결과를 앱이 아는
  // 이름으로 바꿔 달아 여기로 보낸다. PC 는 결제창 반환값으로 같은 일을 시트 안에서
  // 끝내므로 이 갈래를 타지 않는다.
  //
  // 파라미터는 읽자마자 주소창에서 지운다 — 새로고침해도 같은 결제를 다시 확인하지
  // 않게 하려는 것이고, StrictMode 가 effect 를 두 번 불러도 두 번째는 빈손으로 끝난다.
  useEffect(() => {
    if (!authenticated) return;

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id");
    const errorCode = params.get("payment_error");
    if (!paymentId && !errorCode) return;

    const message = params.get("payment_message");
    params.delete("payment_id");
    params.delete("payment_error");
    params.delete("payment_message");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);

    if (errorCode || !paymentId) {
      showToast(message ?? "결제가 완료되지 않았어요", "error");
      return;
    }

    void (async () => {
      setVerifyingPayment(true);
      const completed = await confirmPayment(paymentId);
      setVerifyingPayment(false);
      if (!completed.ok) {
        showToast(completed.message, "error");
        return;
      }
      completePayment(receiptFrom(completed.receipt));
    })();
  }, [authenticated, showToast, completePayment]);

  // 옮길 건을 updater 밖에서 찾는다. updater 안에서 다른 state 를 건드리면
  // StrictMode 가 두 번 부를 때 취소 내역이 두 줄로 늘어난다.
  const cancelOrder = useCallback(
    (orderId: string) => {
      const target = orders.find((order) => order.id === orderId);
      if (!target) return;
      const now = new Date();
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setCancellations((prev) => [cancellationFromOrder(target, now), ...prev]);
    },
    [orders],
  );

  const openMyTab = useCallback((tab: MyTabKey) => {
    setMyTab(tab);
    setScreen("my");
  }, []);

  const nav = useMemo<AppNav>(() => {
    return {
      navigate: (s) => setScreen(s),
      openDetail: (id) => {
        setSelectedId(id);
        setScreen("detail");
      },
      openEdit: (id) => {
        setEditingId(id);
        setScreen("edit");
      },
      toast: showToast,
      bookmarks,
      toggleBookmark: (id) =>
        setBookmarks((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      user: session.user,
      profile,
      saveProfile,
      signOut: () => void handleSignOut(),
      places,
      placesStatus,
      reloadPlaces,
      loadMorePlaces: () => void loadMore(),
      loadingMorePlaces,
      hasMorePlaces,
      openBanner: (id) => {
        setProductId(id);
        setScreen("banner");
      },
      completePayment,
      cancelOrder,
      orders,
      cancellations,
      myTab,
      openMyTab,
    };
  }, [
    bookmarks,
    session.user,
    profile,
    saveProfile,
    showToast,
    handleSignOut,
    places,
    placesStatus,
    reloadPlaces,
    loadMore,
    loadingMorePlaces,
    hasMorePlaces,
    completePayment,
    cancelOrder,
    orders,
    cancellations,
    myTab,
    openMyTab,
  ]);

  const renderScreen = useCallback(() => {
    switch (activeScreen) {
      case "login":
        return <LoginScreen />;
      case "detail":
        return <DetailScreen placeId={toPlaceId(selectedId)} nav={nav} />;
      case "register":
        return <RegisterScreen nav={nav} />;
      case "edit":
        return <RegisterScreen nav={nav} placeId={toPlaceId(editingId)} />;
      case "my":
        return <MyScreen nav={nav} />;
      case "banner":
        return <BannerDetailScreen productId={productId} nav={nav} />;
      case "payment-complete":
        return <PaymentCompleteScreen receipt={receipt} nav={nav} />;
      case "main":
      default:
        return <MainScreen nav={nav} />;
    }
  }, [activeScreen, selectedId, editingId, productId, receipt, nav]);

  return (
    <>
      {/* 세션을 확인하는 동안은 아무 화면도 보이지 않는다.
          이게 없으면 이미 로그인한 사용자에게 로그인 화면이 한 번 번쩍인다.
          결제창에서 돌아와 결과를 확인하는 동안도 같다 — 그 사이 메인 화면이
          한 번 스쳐 지나가면 결제가 실패한 것처럼 보인다. */}
      {session.status === "loading" || verifyingPayment ? (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-background-inverse)",
          }}
        >
          <Spinner size={32} color="var(--color-text-on-inverse)" />
        </div>
      ) : (
        renderScreen()
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            top: "calc(16px + env(safe-area-inset-top))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            width: "min(420px, calc(100vw - 32px))",
          }}
        >
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </>
  );
}
