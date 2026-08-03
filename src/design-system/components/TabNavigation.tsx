"use client";

export type TabItem = { key: string; label: string };

export type TabNavigationProps = {
  tabs: TabItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  /** stretch tabs to fill the width evenly */
  fullWidth?: boolean;
};

export function TabNavigation({
  tabs,
  activeKey,
  onChange,
  fullWidth = false,
}: TabNavigationProps) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        height: 48,
        width: fullWidth ? "100%" : "auto",
        background: "var(--color-background-default)",
        borderBottom: "1px solid var(--color-border-default)",
        boxSizing: "border-box",
      }}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(t.key)}
            className="text-label-lg"
            style={{
              flex: fullWidth ? 1 : "0 0 auto",
              height: 48,
              padding: "0 20px",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: active ? "var(--color-text-brand)" : "var(--color-text-subtle)",
              boxShadow: active ? "inset 0 -2px 0 var(--color-background-brand)" : "none",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
