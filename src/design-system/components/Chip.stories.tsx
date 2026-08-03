import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Chip } from "./Chip";
import { ICON_NAMES } from "../tokens";

const meta: Meta<typeof Chip> = {
  title: "Components/Form/Chip",
  component: Chip,
  parameters: { layout: "centered" },
  args: { label: "한식", size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    icon: { control: "select", options: [undefined, ...ICON_NAMES] },
  },
};
export default meta;
type Story = StoryObj<typeof Chip>;

export const Playground: Story = {
  render: (args) => {
    const [selected, setSelected] = useState(false);
    return <Chip {...args} selected={selected} onClick={() => setSelected((s) => !s)} />;
  },
};

export const Filters: Story = {
  render: () => {
    const [active, setActive] = useState<string>("전체");
    const filters = ["전체", "한식", "일식", "양식", "카페"];
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {filters.map((f) => (
          <Chip key={f} label={f} selected={active === f} onClick={() => setActive(f)} />
        ))}
      </div>
    );
  },
};

export const Variants: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 24 }}>
      {(["md", "sm"] as const).map((size) => (
        <div key={size} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="text-label-md" style={{ width: 40, color: "var(--color-text-muted)" }}>{size}</span>
          <Chip size={size} label="Chip" />
          <Chip size={size} label="Chip" icon="star" />
          <Chip size={size} label="Chip" selected />
          <Chip size={size} label="Chip" icon="star" selected />
          <Chip size={size} label="Chip" disabled />
          <Chip size={size} label="Chip" selected disabled />
        </div>
      ))}
    </div>
  ),
};
