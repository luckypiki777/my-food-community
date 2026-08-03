import type { CSSProperties } from "react";

export type SkeletonVariant = "text" | "rectangle" | "circle";

export type SkeletonProps = {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  /** number of lines for the text variant */
  lines?: number;
  radius?: number;
  style?: CSSProperties;
};

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  radius,
  style,
}: SkeletonProps) {
  if (variant === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: width ?? "100%", ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className="ds-skeleton"
            style={{
              display: "block",
              height: height ?? 14,
              borderRadius: radius ?? 4,
              width: lines > 1 && i === lines - 1 ? "60%" : "100%",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "circle") {
    const size = width ?? height ?? 44;
    return (
      <span
        className="ds-skeleton"
        style={{ display: "block", width: size, height: size, borderRadius: "9999px", ...style }}
      />
    );
  }

  return (
    <span
      className="ds-skeleton"
      style={{
        display: "block",
        width: width ?? "100%",
        height: height ?? 90,
        borderRadius: radius ?? 8,
        ...style,
      }}
    />
  );
}
