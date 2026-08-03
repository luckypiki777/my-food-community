"use client";

import { Icon } from "../Icon";
import type { IconName } from "../tokens";

export type BottomNavItem = { key: string; icon: IconName; label?: string };

export type BottomNavigationProps = {
  items: BottomNavItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  showLabels?: boolean;
};

export function BottomNavigation({
  items,
  activeKey,
  onChange,
  showLabels = true,
}: BottomNavigationProps) {
  return (
    <nav
      style={{
        display: "flex",
        height: 56,
        width: "100%",
        background: "var(--color-background-default)",
        borderTop: "1px solid var(--color-border-default)",
        boxSizing: "border-box",
      }}
    >
      {items.map((it) => {
        const active = it.key === activeKey;
        const color = active ? "var(--color-text-brand)" : "var(--color-text-subtle)";
        return (
          <button
            key={it.key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange?.(it.key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              height: 56,
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          >
            <Icon name={it.icon} size={24} color={color} />
            {showLabels && it.label && (
              <span className="text-label-md" style={{ color }}>
                {it.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
