"use client";

import type { InputHTMLAttributes } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../tokens";

export type FieldSize = "sm" | "md" | "lg";

export type TextFieldProps = {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  size?: FieldSize;
  leftIcon?: IconName;
  rightIcon?: IconName;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export const FIELD_SIZE: Record<
  FieldSize,
  { height: number; padX: number; icon: number }
> = {
  sm: { height: 32, padX: 12, icon: 16 },
  md: { height: 40, padX: 12, icon: 20 },
  lg: { height: 48, padX: 14, icon: 20 },
};

export function TextField({
  label,
  helperText,
  errorMessage,
  size = "md",
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...inputProps
}: TextFieldProps) {
  const s = FIELD_SIZE[size];
  const error = !!errorMessage;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {label && (
        <label className="text-label-lg" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </label>
      )}
      <div
        className="ds-field-box"
        data-error={error}
        style={{ gap: 8, height: s.height, padding: `0 ${s.padX}px` }}
      >
        {leftIcon && <Icon name={leftIcon} size={s.icon} color="var(--color-text-muted)" />}
        <input
          className="text-body-lg ds-field-input"
          disabled={disabled}
          aria-invalid={error || undefined}
          {...inputProps}
        />
        {error ? (
          <Icon name="error" size={s.icon} color="var(--color-text-error)" />
        ) : rightIcon ? (
          <Icon name={rightIcon} size={s.icon} color="var(--color-text-muted)" />
        ) : null}
      </div>
      {(errorMessage || helperText) && (
        <span
          className="text-label-md"
          style={{ color: error ? "var(--color-text-error)" : "var(--color-text-subtle)" }}
        >
          {errorMessage || helperText}
        </span>
      )}
    </div>
  );
}