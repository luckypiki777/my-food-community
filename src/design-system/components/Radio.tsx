"use client";

import type { CSSProperties } from "react";

export type RadioSize = "sm" | "md";

export type RadioProps = {
  checked?: boolean;
  label?: string;
  size?: RadioSize;
  disabled?: boolean;
  name?: string;
  value?: string;
  onChange?: (value?: string) => void;
  id?: string;
};

const DIAMETER: Record<RadioSize, { ring: number; dot: number }> = {
  sm: { ring: 16, dot: 8 },
  md: { ring: 20, dot: 10 },
};

export function Radio({
  checked = false,
  label,
  size = "md",
  disabled = false,
  value,
  onChange,
  id,
}: RadioProps) {
  const { ring, dot } = DIAMETER[size];

  const ringStyle: CSSProperties = {
    width: ring,
    height: ring,
    borderRadius: "9999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxSizing: "border-box",
    background: "var(--color-background-default)",
    border: checked
      ? "2px solid var(--color-border-brand)"
      : "1.5px solid var(--color-border-strong)",
  };

  return (
    <button
      type="button"
      role="radio"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(value)}
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
      <span style={ringStyle}>
        {checked && (
          <span
            style={{
              width: dot,
              height: dot,
              borderRadius: "9999px",
              background: "var(--color-background-brand)",
            }}
          />
        )}
      </span>
      {label && (
        <span className="text-body-md" style={{ color: "var(--color-text-default)" }}>
          {label}
        </span>
      )}
    </button>
  );
}