import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TYPE_STYLES, type TypeStyle } from "./tokens";

const meta: Meta = {
  title: "Foundations/Typography",
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

const SAMPLE = "숨은 맛집을 발견하다 · Hidden Gems Aa 123";

function TypeRow({ style }: { style: TypeStyle }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "baseline",
        padding: "18px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div style={{ width: 240, flexShrink: 0 }}>
        <div className="text-label-lg">{style.name.replace("text-", "")}</div>
        <div
          className="text-label-md"
          style={{ ...mono, color: "var(--color-text-muted)", marginTop: 2 }}
        >
          {style.fontSize}px · {style.weightLabel} · lh {style.lineHeight}
        </div>
        <div
          className="text-label-md"
          style={{ ...mono, color: "var(--color-text-muted)" }}
        >
          {style.sizeToken}
        </div>
      </div>
      <div className={style.name} style={{ minWidth: 0, overflow: "hidden" }}>
        {SAMPLE}
      </div>
    </div>
  );
}

export const TypeScale: Story = {
  render: () => (
    <div style={page}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-display-sm">Typography</h1>
        <p
          className="text-body-md"
          style={{ color: "var(--color-text-subtle)", marginTop: 4 }}
        >
          Pretendard Variable · letter-spacing −2% (공통 자간) · 10 type styles.
          Source: design.pen
        </p>
      </div>
      {TYPE_STYLES.map((s) => (
        <TypeRow key={s.name} style={s} />
      ))}
    </div>
  ),
};

const WEIGHTS: { label: string; token: string; weight: number }[] = [
  { label: "Regular", token: "font-weight-regular", weight: 400 },
  { label: "SemiBold", token: "font-weight-semibold", weight: 600 },
  { label: "Bold", token: "font-weight-bold", weight: 700 },
];

const SIZES = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const SIZE_PX: Record<number, number> = {
  100: 12, 200: 14, 300: 16, 400: 20, 500: 24, 600: 28, 700: 32, 800: 36, 900: 40,
};

export const Primitives: Story = {
  render: () => (
    <div style={page}>
      <h1 className="text-display-sm" style={{ marginBottom: 20 }}>
        Type primitives
      </h1>

      <h2 className="text-heading-md" style={{ margin: "8px 0 12px" }}>
        Font size
      </h2>
      {SIZES.map((s) => (
        <div
          key={s}
          style={{
            display: "flex",
            gap: 24,
            alignItems: "baseline",
            padding: "12px 0",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <div
            className="text-label-md"
            style={{ ...mono, width: 160, flexShrink: 0, color: "var(--color-text-muted)" }}
          >
            font-size-{s} · {SIZE_PX[s]}px
          </div>
          <div style={{ fontSize: SIZE_PX[s], fontWeight: 600, lineHeight: 1.2 }}>
            숨은 맛집 Aa
          </div>
        </div>
      ))}

      <h2 className="text-heading-md" style={{ margin: "28px 0 12px" }}>
        Font weight
      </h2>
      {WEIGHTS.map((w) => (
        <div
          key={w.token}
          style={{
            display: "flex",
            gap: 24,
            alignItems: "baseline",
            padding: "12px 0",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <div
            className="text-label-md"
            style={{ ...mono, width: 220, flexShrink: 0, color: "var(--color-text-muted)" }}
          >
            {w.token} · {w.weight}
          </div>
          <div style={{ fontSize: 24, fontWeight: w.weight, lineHeight: 1.2 }}>
            숨은 맛집을 발견하다 Hidden Gems
          </div>
        </div>
      ))}
    </div>
  ),
};
