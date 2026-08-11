import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, type AvatarSize } from "./Avatar";

const SAMPLE = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=192&h=192&fit=crop";

const meta: Meta<typeof Avatar> = {
  title: "Components/Others/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  args: { src: SAMPLE, alt: "", size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
  },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const Playground: Story = {};

/** src 가 없으면 기본 아이콘으로 떨어진다. 프로필 사진을 아직 안 올린 상태. */
export const Fallback: Story = {
  args: { src: null },
};

const SIZES: AvatarSize[] = ["sm", "md", "lg", "xl"];

export const AllSizes: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div
      style={{
        padding: 32,
        background: "var(--color-background-default)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {([SAMPLE, null] as const).map((src) => (
        <div key={src ?? "fallback"} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {SIZES.map((size) => (
            <div
              key={size}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <Avatar src={src} size={size} />
              <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
                {size}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};
