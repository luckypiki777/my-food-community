"use client";

import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  /** show a "{length}/{maxLength}" counter (requires maxLength) */
  showCounter?: boolean;
  rows?: number;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({
  label,
  helperText,
  errorMessage,
  showCounter = false,
  rows = 3,
  disabled,
  value,
  maxLength,
  style,
  ...props
}: TextareaProps) {
  const error = !!errorMessage;
  const length = typeof value === "string" ? value.length : 0;

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
      <div className="ds-field-box" data-error={error} style={{ padding: "10px 14px" }}>
        <textarea
          className="text-body-lg ds-field-input"
          rows={rows}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          aria-invalid={error || undefined}
          style={{ resize: "none", lineHeight: "var(--font-line-height-normal)" }}
          {...props}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span
          className="text-label-md"
          style={{ color: error ? "var(--color-text-error)" : "var(--color-text-subtle)" }}
        >
          {errorMessage || helperText}
        </span>
        {showCounter && maxLength ? (
          <span className="text-label-md" style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
            {length}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}