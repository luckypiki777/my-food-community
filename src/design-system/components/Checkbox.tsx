"use client";

import type { CSSProperties } from "react";

export type CheckboxSize = "sm" | "md";

export type CheckboxProps = {
  checked?: boolean;
  indeterminate?: boolean;
  label?: string;
  size?: CheckboxSize;
  disabled?: boolean;
  error?: boolean;
  onChange?: (checked: boolean) => void;
  id?: string;
};

const BOX: Record<CheckboxSize, { box: number; radius: number }> = {
  sm: { box: 16, radius: 4 },
  md: { box: 20, radius: 5 },
};

export function Checkbox({
  checked = false,
  indeterminate = false,
  label,
  size = "md",
  disabled = false,
  error = false,
  onChange,
  id,
}: CheckboxProps) {
  const { box, radius } = BOX[size];
  const active = checked || indeterminate;

  const boxStyle: CSSProperties = {
    width: box,
    height: box,
    borderRadius: radius,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxSizing: "border-box",
    background: active ? "var(--color-background-brand)" : "var(--color-background-default)",
    border: active
      ? error
        ? "1.5px solid var(--color-border-error)"
        : "none"
      : `1.5px solid ${error ? "var(--color-border-error)" : "var(--color-border-strong)"}`,
  };

  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "none",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={boxStyle}>
        {indeterminate ? (
          <span
            style={{
              width: box * 0.5,
              height: 2,
              borderRadius: 1,
              background: "var(--color-text-on-brand)",
            }}
          />
        ) : checked ? (
          <svg viewBox="0 0 20 20" width={box} height={box} aria-hidden>
            <path
              d="M5 10.5 L8.5 14 L15 6.5"
              fill="none"
              stroke="var(--color-text-on-brand)"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label && (
        <span className="text-body-md" style={{ color: "var(--color-text-default)" }}>
          {label}
        </span>
      )}
    </button>
  );
}