export type BadgeType = "neutral" | "success" | "error" | "info" | "warning";
export type BadgeSize = "md" | "lg";

const SIZE: Record<BadgeSize, { height: number; radius: number }> = {
  md: { height: 20, radius: 10 },
  lg: { height: 24, radius: 12 },
};

const COLOR: Record<BadgeType, { border: string; text: string }> = {
  neutral: { border: "var(--color-border-default)", text: "var(--color-text-secondary)" },
  success: { border: "var(--color-border-success)", text: "var(--color-text-success)" },
  error: { border: "var(--color-border-error)", text: "var(--color-text-error)" },
  info: { border: "var(--color-border-info)", text: "var(--color-text-info)" },
  warning: { border: "var(--color-border-warning)", text: "var(--color-text-warning)" },
};

export type BadgeProps = {
  children: React.ReactNode;
  type?: BadgeType;
  size?: BadgeSize;
};

export function Badge({ children, type = "neutral", size = "md" }: BadgeProps) {
  const s = SIZE[size];
  const c = COLOR[type];
  return (
    <span
      className="text-label-md"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: s.height,
        padding: "0 8px",
        borderRadius: s.radius,
        border: `1px solid ${c.border}`,
        color: c.text,
        background: "var(--color-background-default)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
