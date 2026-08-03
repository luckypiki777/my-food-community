import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Radio } from "./Radio";

const meta: Meta<typeof Radio> = {
  title: "Components/Form/Radio",
  component: Radio,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Radio>;

export const Playground: Story = {
  render: () => {
    const [value, setValue] = useState("kimbap");
    const options = [
      { value: "kimbap", label: "김밥" },
      { value: "noodle", label: "국수" },
      { value: "soup", label: "찌개" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }} role="radiogroup">
        {options.map((o) => (
          <Radio
            key={o.value}
            name="menu"
            value={o.value}
            label={o.label}
            checked={value === o.value}
            onChange={(v) => v && setValue(v)}
          />
        ))}
      </div>
    );
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
            <Radio size={size} label="Unselected" checked={false} />
            <Radio size={size} label="Selected" checked />
            <Radio size={size} label="Disabled" disabled />
            <Radio size={size} label="Selected disabled" checked disabled />
          </div>
        </div>
      ))}
    </div>
  ),
};
