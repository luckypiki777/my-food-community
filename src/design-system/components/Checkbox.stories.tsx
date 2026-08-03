import { Fragment, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Form/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Playground: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return <Checkbox label="동의합니다" checked={checked} onChange={setChecked} />;
  },
};

const cell: React.CSSProperties = { display: "flex", alignItems: "center" };
const cap: React.CSSProperties = { color: "var(--color-text-muted)" };

export const States: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh" }}>
      {(["md", "sm"] as const).map((size) => (
        <div key={size} style={{ marginBottom: 32 }}>
          <h3 className="text-heading-sm" style={{ marginBottom: 16 }}>
            size {size}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(3, 140px)", gap: 16, alignItems: "center" }}>
            <span />
            <span className="text-label-md" style={cap}>default</span>
            <span className="text-label-md" style={cap}>disabled</span>
            <span className="text-label-md" style={cap}>error</span>
            {(["unchecked", "checked", "indeterminate"] as const).map((sel) => (
              <Fragment key={sel}>
                <span className="text-label-md" style={cap}>{sel}</span>
                {(["default", "disabled", "error"] as const).map((st) => (
                  <span key={sel + st} style={cell}>
                    <Checkbox
                      size={size}
                      label="Label"
                      checked={sel === "checked"}
                      indeterminate={sel === "indeterminate"}
                      disabled={st === "disabled"}
                      error={st === "error"}
                    />
                  </span>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
