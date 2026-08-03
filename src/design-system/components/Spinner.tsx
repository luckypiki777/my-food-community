import type { CSSProperties, HTMLAttributes } from "react";

export type SpinnerProps = {
  /** diameter in px (design system default: 24 / md) */
  size?: number;
  /** ring color — defaults to the brand color; pass "currentColor" to inherit */
  color?: string;
  className?: string;
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLSpanElement>, "color">;

export function Spinner({
  size = 24,
  color = "var(--color-background-brand)",
  className,
  style,
  ...rest
}: SpinnerProps) {
  const borderWidth = Math.max(2, Math.round(size / 10));
  return (
    <span
      role="status"
      aria-label="로딩 중"
      className={["ds-spin", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "9999px",
        borderStyle: "solid",
        borderWidth,
        borderColor: `color-mix(in srgb, ${color} 22%, transparent)`,
        borderTopColor: color,
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    />
  );
}
