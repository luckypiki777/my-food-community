import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomSheet } from "./BottomSheet";
import { MenuItem, MenuDivider } from "./Menu";
import { Button } from "./Button";

const meta: Meta<typeof BottomSheet> = {
  title: "Components/Others/BottomSheet",
  component: BottomSheet,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof BottomSheet>;

export const Options: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>바텀시트 열기</Button>
        <BottomSheet open={open} title="옵션" onClose={() => setOpen(false)}>
          <MenuItem icon="copy" label="링크 복사" onClick={() => setOpen(false)} />
          <MenuItem icon="share" label="공유" onClick={() => setOpen(false)} />
          <MenuItem icon="bookmark" label="저장" onClick={() => setOpen(false)} />
          <MenuDivider />
          <MenuItem icon="delete" label="삭제" variant="destructive" onClick={() => setOpen(false)} />
        </BottomSheet>
      </>
    );
  },
};
