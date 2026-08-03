"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { FIELD_SIZE, type FieldSize } from "./TextField";

export type SelectOption = { value: string; label: string };

export type SelectItemProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  size?: FieldSize;
  onSelect?: () => void;
};

const ITEM_HEIGHT: Record<FieldSize, number> = { sm: 32, md: 40, lg: 48 };

export function SelectItem({
  label,
  selected = false,
  disabled = false,
  size = "md",
  onSelect,
}: SelectItemProps) {
  const iconSize = FIELD_SIZE[size].icon;
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onSelect}
      className="text-body-lg ds-select-item"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        width: "100%",
        height: ITEM_HEIGHT[size],
        padding: "0 12px",
        border: "none",
        background: "transparent",
        color: "var(--color-text-default)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        textAlign: "left",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {selected && <Icon name="check" size={iconSize} color="var(--color-text-brand)" />}
    </button>
  );
}

export type SelectProps = {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  size?: FieldSize;
  disabled?: boolean;
  helperText?: string;
  errorMessage?: string;
  onChange?: (value: string) => void;
};

export function Select({
  label,
  placeholder = "선택하세요",
  options,
  value,
  defaultValue,
  size = "md",
  disabled = false,
  helperText,
  errorMessage,
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const current = value !== undefined ? value : internal;
  const ref = useRef<HTMLDivElement>(null);
  const s = FIELD_SIZE[size];
  const error = !!errorMessage;
  const selectedOption = options.find((o) => o.value === current);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label && (
        <label className="text-label-lg" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </label>
      )}

      <button
        type="button"
        className="ds-field-box text-body-lg"
        data-error={error}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          gap: 8,
          height: s.height,
          padding: `0 ${s.padX}px`,
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          ...(open
            ? {
                borderColor: error ? "var(--color-border-error)" : "var(--color-border-brand)",
                boxShadow: `inset 0 0 0 1px ${
                  error ? "var(--color-border-error)" : "var(--color-border-brand)"
                }`,
              }
            : null),
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: selectedOption ? "var(--color-text-default)" : "var(--color-text-muted)",
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={s.icon}
          color="var(--color-text-muted)"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            zIndex: 20,
            background: "var(--color-background-surface)",
            border: "1px solid var(--color-border-default)",
            borderRadius: 8,
            boxShadow: "0 8px 24px #1c1c1c1f",
            padding: "4px 0",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {options.map((o) => (
            <SelectItem
              key={o.value}
              label={o.label}
              size={size}
              selected={o.value === current}
              onSelect={() => select(o.value)}
            />
          ))}
        </div>
      )}

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
