import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconButton, type IconButtonVariant } from "./IconButton";
import { ICON_NAMES } from "../tokens";

const meta: Meta<typeof IconButton> = {
  title: "Components/Action/IconButton",
  component: IconButton,
  parameters: { layout: "centered" },
  args: {
    icon: "heart",
    variant: "ghost",
    "aria-label": "즐겨찾기",
    disabled: false,
  },
  argTypes: {
    icon: { control: "select", options: ICON_NAMES },
    variant: {
      control: "inline-radio",
      options: ["ghost", "circle-brand", "circle-neutral"],
    },
    onClick: { action: "clicked" },
  },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const Playground: Story = {};

const VARIANTS: { variant: IconButtonVariant; label: string }[] = [
  { variant: "ghost", label: "Ghost" },
  { variant: "circle-brand", label: "Circle · Brand" },
  { variant: "circle-neutral", label: "Circle · Neutral" },
];

export const Variants: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div
      style={{
        padding: 32,
        background: "var(--color-background-default)",
        minHeight: "100vh",
        display: "flex",
        gap: 56,
      }}
    >
      {VARIANTS.map((v) => (
        <div
          key={v.variant}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
        >
          <IconButton icon="heart" variant={v.variant} aria-label={v.label} />
          <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
            {v.label}
          </span>
        </div>
      ))}
    </div>
  ),
};
