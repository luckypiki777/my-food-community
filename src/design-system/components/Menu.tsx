"use client";

import type { ReactNode } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../tokens";

export type MenuItemSize = "sm" | "md" | "lg";
export type MenuItemVariant = "default" | "destructive";

export type MenuItemProps = {
  label: string;
  icon?: IconName;
  size?: MenuItemSize;
  variant?: MenuItemVariant;
  disabled?: boolean;
  onClick?: () => void;
};

const MI_SIZE: Record<MenuItemSize, { height: number; padX: number; icon: number }> = {
  sm: { height: 32, padX: 12, icon: 16 },
  md: { height: 40, padX: 12, icon: 20 },
  lg: { height: 48, padX: 14, icon: 20 },
};

export function MenuItem({
  label,
  icon,
  size = "md",
  variant = "default",
  disabled = false,
  onClick,
}: MenuItemProps) {
  const s = MI_SIZE[size];
  const destructive = variant === "destructive";
  const labelColor = destructive ? "var(--color-text-error)" : "var(--color-text-default)";
  const iconColor = destructive ? "var(--color-text-error)" : "var(--color-text-secondary)";

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="text-body-lg ds-menu-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        height: s.height,
        padding: `0 ${s.padX}px`,
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: labelColor,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        textAlign: "left",
      }}
    >
      {icon && <Icon name={icon} size={s.icon} color={iconColor} />}
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </button>
  );
}

export function MenuDivider() {
  return (
    <div
      role="separator"
      style={{ height: 1, background: "var(--color-border-default)", margin: "4px 0" }}
    />
  );
}

export type MenuProps = {
  children: ReactNode;
  width?: number | string;
};

/** Floating menu panel (desktop dropdown surface). Hosts MenuItem / MenuDivider. */
export function Menu({ children, width = 220 }: MenuProps) {
  return (
    <div
      role="menu"
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: 6,
        borderRadius: 12,
        background: "var(--color-background-default)",
        border: "1px solid var(--color-border-default)",
        boxShadow: "0 8px 24px #00000022",
      }}
    >
      {children}
    </div>
  );
}
