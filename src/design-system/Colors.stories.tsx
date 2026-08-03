import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  PRIMITIVE_PALETTES,
  SHADES,
  SEMANTIC_TEXT,
  SEMANTIC_BACKGROUND,
  SEMANTIC_BORDER,
  type SemanticToken,
} from "./tokens";
import { useTokenHex } from "./useTokenHex";

const meta: Meta = {
  title: "Foundations/Colors",
  parameters: {
    layout: "fullscreen",
    a11y: { test: "off" },
  },
};
export default meta;
type Story = StoryObj;

const page: CSSProperties = {
  padding: 32,
  display: "flex",
  flexDirection: "column",
  gap: 40,
  background: "var(--color-background-default)",
  minHeight: "100vh",
  color: "var(--color-text-default)",
};

const mono: CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

/* ------------------------------------------------------------- Primitive -- */

function PrimitivePalettes() {
  const vars = PRIMITIVE_PALETTES.flatMap((p) =>
    SHADES.map((s) => `--color-${p.key}-${s}`),
  );
  const hex = useTokenHex(vars);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 className="text-display-sm">Primitive palette</h1>
        <p className="text-body-md" style={{ color: "var(--color-text-subtle)", marginTop: 4 }}>
          6 scales × 11 shades (50–950). Source: design.pen
        </p>
      </div>

      {PRIMITIVE_PALETTES.map((p) => (
        <div key={p.key}>
          <div className="text-heading-sm" style={{ marginBottom: 10 }}>
            {p.label}
            <span
              className="text-label-md"
              style={{ ...mono, color: "var(--color-text-muted)", marginLeft: 8 }}
            >
              color-{p.key}-*
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(11, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {SHADES.map((s) => {
              const v = `--color-${p.key}-${s}`;
              return (
                <div key={s} style={{ minWidth: 0 }}>
                  <div
                    style={{
                      height: 64,
                      borderRadius: 8,
                      background: `var(${v})`,
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  />
                  <div className="text-label-lg" style={{ marginTop: 6 }}>
                    {s}
                  </div>
                  <div
                    className="text-label-md"
                    style={{ ...mono, color: "var(--color-text-muted)" }}
                  >
                    {hex[v] ?? "…"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/* -------------------------------------------------------------- Semantic -- */

function SwatchRow({ item }: { item: SemanticToken }) {
  const v = `--${item.token}`;
  const hex = useTokenHex([v]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 12px",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          flexShrink: 0,
          background: `var(${v})`,
          border: "1px solid var(--color-border-default)",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span className="text-label-lg">{item.token}</span>
        <span
          className="text-label-md"
          style={{ ...mono, color: "var(--color-text-muted)" }}
        >
          → {item.ref} · {hex[v] ?? "…"}
        </span>
      </div>
    </div>
  );
}

function SemanticGroup({
  title,
  items,
}: {
  title: string;
  items: SemanticToken[];
}) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border-default)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--color-background-surface)",
      }}
    >
      <div
        className="text-label-lg"
        style={{
          padding: "12px 12px",
          background: "var(--color-background-subtle)",
          borderBottom: "1px solid var(--color-border-default)",
        }}
      >
        {title}
      </div>
      {items.map((it) => (
        <SwatchRow key={it.token} item={it} />
      ))}
    </div>
  );
}

function SemanticTokens() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-display-sm">Semantic tokens</h1>
        <p
          className="text-body-md"
          style={{ color: "var(--color-text-subtle)", marginTop: 4 }}
        >
          Reference primitives only — use these in components, never raw hex.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <SemanticGroup title="Text" items={SEMANTIC_TEXT} />
        <SemanticGroup title="Background" items={SEMANTIC_BACKGROUND} />
        <SemanticGroup title="Border" items={SEMANTIC_BORDER} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Stories -- */

export const Primitive: Story = {
  render: () => (
    <div style={page}>
      <PrimitivePalettes />
    </div>
  ),
};

export const Semantic: Story = {
  render: () => (
    <div style={page}>
      <SemanticTokens />
    </div>
  ),
};

export const Overview: Story = {
  render: () => (
    <div style={page}>
      <PrimitivePalettes />
      <SemanticTokens />
    </div>
  ),
};
