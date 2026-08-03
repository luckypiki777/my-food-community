"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../tokens";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    className?: string;
  };

const SIZE: Record<
  ButtonSize,
  { height: number; padX: number; gap: number; icon: number }
> = {
  sm: { height: 32, padX: 12, gap: 6, icon: 16 },
  md: { height: 40, padX: 16, gap: 8, icon: 20 },
  lg: { height: 48, padX: 20, gap: 8, icon: 20 },
};

const VARIANT: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--color-background-brand)",
    color: "var(--color-text-on-brand)",
    border: "1px solid transparent",
  },
  secondary: {
    background: "transparent",
    color: "var(--color-text-default)",
    border: "1px solid var(--color-border-strong)",
  },
  destructive: {
    background: "transparent",
    color: "var(--color-text-error)",
    border: "1px solid var(--color-border-error)",
  },
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  style,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const s = SIZE[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={["text-label-lg", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: `0 ${s.padX}px`,
        borderRadius: 8,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "filter 0.15s ease",
        ...VARIANT[variant],
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <Spinner size={s.icon} color="currentColor" />
      ) : leftIcon ? (
        <Icon name={leftIcon} size={s.icon} />
      ) : null}
      {children}
      {!loading && rightIcon ? <Icon name={rightIcon} size={s.icon} /> : null}
    </button>
  );
}