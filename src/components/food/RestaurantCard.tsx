"use client";

import { Icon } from "@/design-system/Icon";
import type { Restaurant } from "./data";

export function RestaurantCard({
  restaurant,
  bookmarked = false,
  onToggleBookmark,
  onClick,
}: {
  restaurant: Restaurant;
  bookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  onClick?: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onClick?.(restaurant.id)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(restaurant.id);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 10,
        borderRadius: 16,
        background: "var(--color-background-surface)",
        border: "1px solid var(--color-border-subtle)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <img
        src={restaurant.image}
        alt={restaurant.name}
        style={{
          width: 84,
          height: 84,
          flexShrink: 0,
          borderRadius: 12,
          objectFit: "cover",
          background: "var(--color-background-muted)",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 0 }}>
        <span
          className="text-heading-sm"
          style={{
            color: "var(--color-text-default)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {restaurant.name}
        </span>
        <span
          className="text-label-md"
          style={{
            color: "var(--color-text-muted)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {restaurant.description}
        </span>
      </div>

      <button
        type="button"
        aria-label={bookmarked ? "찜 해제" : "찜하기"}
        aria-pressed={bookmarked}
        onClick={(e) => {
          e.stopPropagation();
          onToggleBookmark?.(restaurant.id);
        }}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          flexShrink: 0,
          border: "none",
          background: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        <Icon
          name="bookmark"
          size={20}
          color={bookmarked ? "var(--color-text-brand)" : "var(--color-text-subtle)"}
          fill={bookmarked ? "var(--color-brand-600)" : "none"}
        />
      </button>
    </div>
  );
}
