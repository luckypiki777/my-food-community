import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TopNavigation } from "./TopNavigation";

const meta: Meta<typeof TopNavigation> = {
  title: "Components/Navigation/TopNavigation",
  component: TopNavigation,
  parameters: { layout: "centered" },
  args: { title: "구로 맛집", leftIcon: "menu", rightIcon: "search" },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 360,
          border: "1px solid var(--color-border-default)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TopNavigation>;

export const MenuTitleSearch: Story = {};

export const NoLeftButton: Story = {
  args: { title: "검색", leftIcon: undefined, rightIcon: "close" },
};

export const NoRightButton: Story = {
  args: { title: "맛집 상세", leftIcon: "arrow-left", rightIcon: undefined },
};

export const Inverse: Story = {
  args: {
    title: "맛집 상세",
    leftIcon: "arrow-left",
    rightIcon: undefined,
    variant: "inverse",
  },
};
