"use client";

import type { ReactNode } from "react";

export type BottomSheetProps = {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  /**
   * 내용 영역의 padding. 기본값은 메뉴형 시트에 맞춘 값이라, 자기 여백이 없는
   * 폼을 담을 때는 `0 16px 8px` 처럼 넉넉하게 넘긴다.
   */
  contentPadding?: string;
  /** 넓은 화면에서 시트가 끝까지 늘어나지 않게 잡아 주는 폭. */
  maxWidth?: number;
};

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  contentPadding = "0 8px 8px",
  maxWidth,
}: BottomSheetProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        background: "#1C1C1CB3",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          background: "var(--color-background-default)",
          borderRadius: "16px 16px 0 0",
          paddingBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
          <span
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "var(--color-border-strong)",
            }}
          />
        </div>
        {title && (
          <div style={{ padding: "6px 12px 10px" }}>
            <span className="text-heading-sm" style={{ color: "var(--color-text-default)" }}>
              {title}
            </span>
          </div>
        )}
        <div style={{ padding: contentPadding }}>{children}</div>
      </div>
    </div>
  );
}
