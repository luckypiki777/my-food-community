"use client";

import { Icon } from "../Icon";
import type { IconName } from "../tokens";

export type ChipSize = "sm" | "md";

export type ChipProps = {
  label: string;
  selected?: boolean;
  size?: ChipSize;
  disabled?: boolean;
  icon?: IconName;
  onClick?: () => void;
};

const SIZE: Record<
  ChipSize,
  { height: number; radius: number; padNoIcon: number; padIcon: number }
> = {
  sm: { height: 24, radius: 12, padNoIcon: 12, padIcon: 6 },
  md: { height: 32, radius: 16, padNoIcon: 16, padIcon: 8 },
};

export function Chip({
  label,
  selected = false,
  size = "md",
  disabled = false,
  icon,
  onClick,
}: ChipProps) {
  const s = SIZE[size];
  const fg = selected ? "var(--color-text-on-brand)" : "var(--color-text-default)";
  const iconColor = selected ? "var(--color-text-on-brand)" : "var(--color-text-subtle)";

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className="text-label-lg"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: s.height,
        padding: `0 ${icon ? s.padIcon : s.padNoIcon}px`,
        borderRadius: s.radius,
        color: fg,
        background: selected
          ? "var(--color-background-brand)"
          : "var(--color-background-default)",
        border: selected ? "1px solid transparent" : "1px solid var(--color-border-default)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {icon && <Icon name={icon} size={16} color={iconColor} />}
      {label}
    </button>
  );
}