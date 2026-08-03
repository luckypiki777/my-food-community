import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabNavigation, type TabItem } from "./TabNavigation";

const TABS: TabItem[] = [
  { key: "overview", label: "개요" },
  { key: "menu", label: "메뉴" },
  { key: "reviews", label: "후기" },
];

const meta: Meta<typeof TabNavigation> = {
  title: "Components/Navigation/TabNavigation",
  component: TabNavigation,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TabNavigation>;

export const AutoWidth: Story = {
  render: () => {
    const [active, setActive] = useState("overview");
    return <TabNavigation tabs={TABS} activeKey={active} onChange={setActive} />;
  },
};

export const FullWidth: Story = {
  render: () => {
    const [active, setActive] = useState("menu");
    return <TabNavigation tabs={TABS} activeKey={active} onChange={setActive} fullWidth />;
  },
};

export const TwoTabs: Story = {
  render: () => {
    const [active, setActive] = useState("photos");
    return (
      <TabNavigation
        tabs={[
          { key: "photos", label: "사진" },
          { key: "videos", label: "영상" },
        ]}
        activeKey={active}
        onChange={setActive}
      />
    );
  },
};
