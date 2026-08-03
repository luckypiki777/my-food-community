import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Components/Feedback/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
  args: { size: 24 },
};
export default meta;
type Story = StoryObj<typeof Spinner>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-end" }}>
      {[16, 20, 24, 32].map((s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Spinner size={s} />
          <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>{s}</span>
        </div>
      ))}
    </div>
  ),
};

export const OnCurrentColor: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, color: "var(--color-text-default)" }}>
      <Spinner size={24} color="currentColor" />
      <span style={{ color: "var(--color-text-brand)" }}>
        <Spinner size={24} color="currentColor" />
      </span>
    </div>
  ),
};
