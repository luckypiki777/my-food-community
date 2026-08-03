"use client";

import { IconButton } from "./IconButton";
import type { IconName } from "../tokens";

export type TopNavigationVariant = "default" | "inverse";

export type TopNavigationProps = {
  title: string;
  leftIcon?: IconName;
  leftLabel?: string;
  onLeftClick?: () => void;
  rightIcon?: IconName;
  rightLabel?: string;
  onRightClick?: () => void;
  /** "inverse" renders a dark bar with light content (used on detail/register). */
  variant?: TopNavigationVariant;
};

export function TopNavigation({
  title,
  leftIcon,
  leftLabel = "뒤로",
  onLeftClick,
  rightIcon,
  rightLabel = "메뉴",
  onRightClick,
  variant = "default",
}: TopNavigationProps) {
  const inverse = variant === "inverse";
  const bg = inverse
    ? "var(--color-background-inverse)"
    : "var(--color-background-default)";
  const fg = inverse
    ? "var(--color-text-on-inverse)"
    : "var(--color-text-default)";
  const border = inverse
    ? "var(--color-background-inverse)"
    : "var(--color-border-default)";
  const iconStyle = { color: fg };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        height: 56,
        padding: "0 8px",
        width: "100%",
        background: bg,
        borderBottom: `1px solid ${border}`,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: 48, height: 48, flexShrink: 0 }}>
        {leftIcon && (
          <IconButton
            icon={leftIcon}
            variant="ghost"
            aria-label={leftLabel}
            onClick={onLeftClick}
            style={iconStyle}
          />
        )}
      </div>
      <span
        className="text-heading-sm"
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "center",
          color: fg,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <div style={{ width: 48, height: 48, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
        {rightIcon && (
          <IconButton
            icon={rightIcon}
            variant="ghost"
            aria-label={rightLabel}
            onClick={onRightClick}
            style={iconStyle}
          />
        )}
      </div>
    </div>
  );
}
