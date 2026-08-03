"use client";

import { Icon } from "../Icon";
import type { IconName } from "../tokens";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastProps = {
  type?: ToastType;
  message: string;
  showClose?: boolean;
  onClose?: () => void;
};

const CONFIG: Record<ToastType, { icon: IconName; token: string }> = {
  success: { icon: "check", token: "success" },
  error: { icon: "error", token: "error" },
  info: { icon: "info", token: "info" },
  warning: { icon: "warning", token: "warning" },
};

export function Toast({ type = "info", message, showClose = true, onClose }: ToastProps) {
  const { icon, token } = CONFIG[type];
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        width: "100%",
        maxWidth: 400,
        boxSizing: "border-box",
        background: "var(--color-background-default)",
        border: `1.5px solid var(--color-border-${token})`,
        boxShadow: "0 4px 16px #00000022",
      }}
    >
      <Icon name={icon} size={20} color={`var(--color-text-${token})`} />
      <span className="text-body-md" style={{ flex: 1, minWidth: 0, color: "var(--color-text-default)" }}>
        {message}
      </span>
      {showClose && (
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          style={{
            display: "inline-flex",
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Icon name="close" size={20} color="var(--color-text-subtle)" />
        </button>
      )}
    </div>
  );
}
