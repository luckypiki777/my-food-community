import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, type ButtonVariant, type ButtonSize } from "./Button";
import { ICON_NAMES } from "../tokens";

const meta: Meta<typeof Button> = {
  title: "Components/Action/Button",
  component: Button,
  parameters: { layout: "centered" },
  args: {
    children: "Button",
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "destructive"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    leftIcon: { control: "select", options: [undefined, ...ICON_NAMES] },
    rightIcon: { control: "select", options: [undefined, ...ICON_NAMES] },
    children: { control: "text" },
    onClick: { action: "clicked" },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {
  args: { leftIcon: "plus" },
};

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "destructive"];
const SIZES: ButtonSize[] = ["lg", "md", "sm"];
const STATES = [
  { label: "default", props: {} },
  { label: "disabled", props: { disabled: true } },
  { label: "loading", props: { loading: true } },
] as const;

const caption: CSSProperties = {
  color: "var(--color-text-subtle)",
};

export const Matrix: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div
      style={{
        padding: 32,
        background: "var(--color-background-default)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 40,
      }}
    >
      {VARIANTS.map((variant) => (
        <section key={variant} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="text-heading-md" style={{ textTransform: "capitalize" }}>
            {variant}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "56px repeat(3, 160px)", gap: 20, alignItems: "center" }}>
            <span />
            {STATES.map((st) => (
              <span key={st.label} className="text-label-md" style={caption}>
                {st.label}
              </span>
            ))}
            {SIZES.map((size) => (
              <ButtonRow key={size} variant={variant} size={size} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

function ButtonRow({ variant, size }: { variant: ButtonVariant; size: ButtonSize }) {
  return (
    <>
      <span className="text-label-md" style={caption}>
        {size}
      </span>
      {STATES.map((st) => (
        <div key={st.label}>
          <Button variant={variant} size={size} leftIcon="plus" {...st.props}>
            Button
          </Button>
        </div>
      ))}
    </>
  );
}
