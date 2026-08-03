"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast, type ToastType } from "@/design-system/components/Toast";
import { MainScreen } from "./screens/MainScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { MyScreen } from "./screens/MyScreen";
import { getRestaurant, RESTAURANTS } from "./data";
import type { AppNav, ScreenKey } from "./types";

type ToastState = { id: number; message: string; type: ToastType };

export function FoodApp() {
  const [screen, setScreen] = useState<ScreenKey>("login");
  const [selectedId, setSelectedId] = useState<string>(RESTAURANTS[0].id);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastSeq = useRef(0);

  // Reset scroll on every screen/selection change (single-page demo navigation).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen, selectedId]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const nav = useMemo<AppNav>(() => {
    return {
      navigate: (s) => setScreen(s),
      openDetail: (id) => {
        setSelectedId(id);
        setScreen("detail");
      },
      toast: (message, type = "info") =>
        setToast({ id: (toastSeq.current += 1), message, type }),
      bookmarks,
      toggleBookmark: (id) =>
        setBookmarks((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    };
  }, [bookmarks]);

  const renderScreen = useCallback(() => {
    switch (screen) {
      case "login":
        return <LoginScreen nav={nav} />;
      case "detail": {
        const restaurant = getRestaurant(selectedId) ?? RESTAURANTS[0];
        return <DetailScreen restaurant={restaurant} nav={nav} />;
      }
      case "register":
        return <RegisterScreen nav={nav} />;
      case "my":
        return <MyScreen nav={nav} />;
      case "main":
      default:
        return <MainScreen nav={nav} />;
    }
  }, [screen, selectedId, nav]);

  return (
    <>
      {renderScreen()}

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
