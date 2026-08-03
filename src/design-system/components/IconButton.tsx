"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../tokens";

export type IconButtonVariant = "ghost" | "circle-brand" | "circle-neutral";

export type IconButtonProps = {
  icon: IconName;
  /** accessible label (required — icon-only control) */
  "aria-label": string;
  variant?: IconButtonVariant;
  /** button box size in px (design system: 48) */
  size?: number;
  /** glyph size in px (design system: 24) */
  iconSize?: number;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    className?: string;
  };

const VARIANT: Record<IconButtonVariant, CSSProperties> = {
  ghost: {
    background: "transparent",
    color: "var(--color-text-default)",
    borderRadius: 8,
  },
  "circle-brand": {
    background: "var(--color-background-brand)",
    color: "var(--color-text-on-brand)",
    borderRadius: 9999,
  },
  "circle-neutral": {
    background: "var(--color-background-subtle)",
    color: "var(--color-text-default)",
    borderRadius: 9999,
  },
};

export function IconButton({
  icon,
  variant = "ghost",
  size = 48,
  iconSize = 24,
  disabled = false,
  style,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        border: "none",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...VARIANT[variant],
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}