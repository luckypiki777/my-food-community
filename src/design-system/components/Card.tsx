"use client";

import type { ReactNode } from "react";

export type CardProps = {
  imageSrc?: string;
  imageAlt?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
  width?: number | string;
  onClick?: () => void;
};

export function Card({
  imageSrc,
  imageAlt = "",
  title,
  description,
  children,
  width = 280,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width,
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--color-background-default)",
        border: "1px solid var(--color-border-default)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {imageSrc && (
        <img
          src={imageSrc}
          alt={imageAlt}
          style={{ display: "block", width: "100%", height: 160, objectFit: "cover" }}
        />
      )}
      {children ?? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 16 }}>
          {title && (
            <span className="text-heading-sm" style={{ color: "var(--color-text-default)" }}>
              {title}
            </span>
          )}
          {description && (
            <span className="text-body-md" style={{ color: "var(--color-text-secondary)" }}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
