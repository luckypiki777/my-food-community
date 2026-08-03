import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Menu, MenuItem, MenuDivider, type MenuItemSize } from "./Menu";

const meta: Meta = {
  title: "Components/Others/Menu",
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj;

export const Panel: Story = {
  render: () => (
    <Menu>
      <MenuItem icon="edit" label="수정" />
      <MenuItem icon="copy" label="복제" />
      <MenuItem icon="share" label="공유" />
      <MenuDivider />
      <MenuItem icon="delete" label="삭제" variant="destructive" />
    </Menu>
  ),
};

export const ItemStates: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh", display: "flex", gap: 32 }}>
      {(["lg", "md", "sm"] as MenuItemSize[]).map((size) => (
        <div key={size} style={{ display: "flex", flexDirection: "column", gap: 8, width: 220 }}>
          <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>size {size}</span>
          <Menu>
            <MenuItem icon="edit" label="Edit item" size={size} />
            <MenuItem icon="edit" label="Disabled" size={size} disabled />
            <MenuItem icon="delete" label="Delete" size={size} variant="destructive" />
            <MenuItem icon="delete" label="Delete" size={size} variant="destructive" disabled />
          </Menu>
        </div>
      ))}
    </div>
  ),
};
