import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ICON_NAMES, ICON_SIZES } from "./tokens";
import { Icon } from "./Icon";

const meta: Meta = {
  title: "Foundations/Iconography",
  parameters: {
    layout: "fullscreen",
    a11y: { test: "off" },
  },
};
export default meta;
type Story = StoryObj;

const page: CSSProperties = {
  padding: 32,
  background: "var(--color-background-default)",
  minHeight: "100vh",
  color: "var(--color-text-default)",
};

const mono: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

function IconCard({ name }: { name: (typeof ICON_NAMES)[number] }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border-default)",
        borderRadius: 12,
        padding: 16,
        background: "var(--color-background-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 16,
          minHeight: 40,
          color: "var(--color-text-default)",
        }}
      >
        {ICON_SIZES.map((s) => (
          <div
            key={s}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
          >
            <Icon name={name} size={s} />
            <span className="text-label-md" style={{ ...mono, color: "var(--color-text-muted)" }}>
              {s}
            </span>
          </div>
        ))}
      </div>
      <span className="text-label-lg">{name}</span>
    </div>
  );
}

export const AllIcons: Story = {
  render: () => (
    <div style={page}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-display-sm">Iconography</h1>
        <p className="text-body-md" style={{ color: "var(--color-text-subtle)", marginTop: 4 }}>
          Lucide · {ICON_NAMES.length} icons × sizes {ICON_SIZES.join(" / ")}px.
          Source: design.pen
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {ICON_NAMES.map((name) => (
          <IconCard key={name} name={name} />
        ))}
      </div>
    </div>
  ),
};
