import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, type BadgeType } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Others/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  args: { children: "Badge", type: "neutral", size: "md" },
  argTypes: {
    type: { control: "inline-radio", options: ["neutral", "success", "error", "info", "warning"] },
    size: { control: "inline-radio", options: ["md", "lg"] },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Playground: Story = {};

const TYPES: BadgeType[] = ["neutral", "success", "error", "info", "warning"];

export const AllTypes: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>
      {(["md", "lg"] as const).map((size) => (
        <div key={size} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="text-label-md" style={{ width: 40, color: "var(--color-text-muted)" }}>{size}</span>
          {TYPES.map((t) => (
            <Badge key={t} type={t} size={size}>
              {t[0].toUpperCase() + t.slice(1)}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
};
