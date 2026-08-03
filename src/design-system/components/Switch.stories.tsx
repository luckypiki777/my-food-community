import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Switch } from "./Switch";

const meta: Meta<typeof Switch> = {
  title: "Components/Form/Switch",
  component: Switch,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Switch>;

export const Playground: Story = {
  render: () => {
    const [on, setOn] = useState(true);
    return <Switch label="알림 받기" checked={on} onChange={setOn} />;
  },
};

export const States: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh" }}>
      {(["md", "sm"] as const).map((size) => (
        <div key={size} style={{ marginBottom: 28 }}>
          <h3 className="text-heading-sm" style={{ marginBottom: 16 }}>size {size}</h3>
          <div style={{ display: "flex", gap: 40 }}>
            <Switch size={size} label="Off" checked={false} />
            <Switch size={size} label="On" checked />
            <Switch size={size} label="Off disabled" disabled />
            <Switch size={size} label="On disabled" checked disabled />
          </div>
        </div>
      ))}
    </div>
  ),
};
