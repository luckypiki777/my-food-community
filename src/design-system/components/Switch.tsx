"use client";

export type SwitchSize = "sm" | "md";

export type SwitchProps = {
  checked?: boolean;
  label?: string;
  size?: SwitchSize;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  id?: string;
};

const TRACK: Record<SwitchSize, { w: number; h: number; thumb: number }> = {
  sm: { w: 32, h: 16, thumb: 12 },
  md: { w: 40, h: 20, thumb: 16 },
};

export function Switch({
  checked = false,
  label,
  size = "md",
  disabled = false,
  onChange,
  id,
}: SwitchProps) {
  const t = TRACK[size];

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
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
      <span
        style={{
          width: t.w,
          height: t.h,
          borderRadius: "9999px",
          padding: 2,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
          background: checked
            ? "var(--color-background-brand)"
            : "var(--color-border-strong)",
          transition: "background 0.15s ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: t.thumb,
            height: t.thumb,
            borderRadius: "9999px",
            background: "var(--color-background-default)",
            boxShadow: "0 1px 2px #00000033",
          }}
        />
      </span>
      {label && (
        <span className="text-body-md" style={{ color: "var(--color-text-default)" }}>
          {label}
        </span>
      )}
    </button>
  );
}