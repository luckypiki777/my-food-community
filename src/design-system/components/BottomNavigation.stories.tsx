import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomNavigation, type BottomNavItem } from "./BottomNavigation";

const FIVE: BottomNavItem[] = [
  { key: "home", icon: "home", label: "홈" },
  { key: "search", icon: "search", label: "검색" },
  { key: "saved", icon: "heart", label: "저장" },
  { key: "alerts", icon: "notification", label: "알림" },
  { key: "profile", icon: "user", label: "프로필" },
];

const meta: Meta<typeof BottomNavigation> = {
  title: "Components/Navigation/BottomNavigation",
  component: BottomNavigation,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 360, border: "1px solid var(--color-border-default)", borderRadius: 12, overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof BottomNavigation>;

export const FiveItems: Story = {
  render: () => {
    const [active, setActive] = useState("home");
    return <BottomNavigation items={FIVE} activeKey={active} onChange={setActive} />;
  },
};

export const FourItemsNoLabels: Story = {
  render: () => {
    const [active, setActive] = useState("home");
    return (
      <BottomNavigation
        items={FIVE.slice(0, 4)}
        activeKey={active}
        onChange={setActive}
        showLabels={false}
      />
    );
  },
};

export const ThreeItems: Story = {
  render: () => {
    const [active, setActive] = useState("search");
    return (
      <BottomNavigation
        items={[FIVE[0], FIVE[1], FIVE[4]]}
        activeKey={active}
        onChange={setActive}
      />
    );
  },
};
