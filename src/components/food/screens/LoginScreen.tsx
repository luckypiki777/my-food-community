"use client";

import { Button } from "@/design-system/components/Button";
import { Icon } from "@/design-system/Icon";
import { LOGIN_HERO } from "../data";
import type { AppNav } from "../types";

export function LoginScreen({ nav }: { nav: AppNav }) {
  const start = () => {
    nav.toast("환영해요! 구로 맛집을 시작합니다", "success");
    nav.navigate("main");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
        background: "var(--color-background-inverse)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          borderRadius: 24,
          overflow: "hidden",
          background: "var(--color-background-default)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Hero */}
        <div
          style={{
            position: "relative",
            height: 340,
            overflow: "hidden",
          }}
        >
          <img
            src={LOGIN_HERO}
            alt=""
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
                "linear-gradient(180deg, rgba(63,15,9,0.6) 0%, rgba(63,15,9,0.95) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 32,
              right: 32,
              bottom: 44,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-background-brand)",
                }}
              >
                <Icon name="map-pin" size={24} color="var(--color-text-on-brand)" />
              </div>
              <span className="text-display-md" style={{ color: "var(--color-text-on-inverse)" }}>
                구로 맛집
              </span>
            </div>
            <h1
              className="text-heading-lg"
              style={{ color: "var(--color-text-on-inverse)", margin: 0, whiteSpace: "pre-line" }}
            >
              {"동네가 찾은\n진짜 숨은 맛집"}
            </h1>
            <p className="text-body-lg" style={{ color: "var(--color-brand-100)", margin: 0 }}>
              광고 없이, 이웃이 직접 다녀온 구로 주변 맛집을 발견하세요.
            </p>
          </div>
        </div>

        {/* Sheet */}
        <div
          style={{
            position: "relative",
            marginTop: -24,
            borderRadius: "24px 24px 0 0",
            background: "var(--color-background-default)",
            padding: "32px 24px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              textAlign: "center",
            }}
          >
            <span className="text-heading-md" style={{ color: "var(--color-text-default)" }}>
              3초 만에 시작하기
            </span>
            <span className="text-body-md" style={{ color: "var(--color-text-subtle)" }}>
              복잡한 가입 없이 구글 계정으로 바로 시작해요
            </span>
          </div>

          <Button variant="secondary" size="lg" style={{ width: "100%" }} onClick={start}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: 5,
                background: "#ffffff",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-brand-600)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              G
            </span>
            구글로 시작하기
          </Button>

          <span
            className="text-label-md"
            style={{ color: "var(--color-text-muted)", textAlign: "center" }}
          >
            시작하면 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </span>
        </div>
      </div>
    </div>
  );
}
