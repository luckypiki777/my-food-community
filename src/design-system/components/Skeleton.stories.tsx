import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Components/Feedback/Skeleton",
  component: Skeleton,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Types: Story = {
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 28, maxWidth: 320 }}>
      <div>
        <div className="text-label-md" style={{ marginBottom: 10, color: "var(--color-text-muted)" }}>텍스트형</div>
        <Skeleton variant="text" lines={3} />
      </div>
      <div>
        <div className="text-label-md" style={{ marginBottom: 10, color: "var(--color-text-muted)" }}>사각형</div>
        <Skeleton variant="rectangle" width={140} height={90} />
      </div>
      <div>
        <div className="text-label-md" style={{ marginBottom: 10, color: "var(--color-text-muted)" }}>원형</div>
        <Skeleton variant="circle" width={52} />
      </div>
    </div>
  ),
};

export const ListItem: Story = {
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, width: 300 }}>
        <Skeleton variant="circle" width={44} />
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" lines={2} />
        </div>
      </div>
    </div>
  ),
};
