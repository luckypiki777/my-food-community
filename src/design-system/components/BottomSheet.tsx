"use client";

import type { ReactNode } from "react";

export type BottomSheetProps = {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: ReactNode;
};

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
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
        background: "#1C1C1CB3",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
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
        <div style={{ padding: "0 8px 8px" }}>{children}</div>
      </div>
    </div>
  );
}
