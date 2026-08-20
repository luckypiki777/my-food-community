import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomSheet } from "./BottomSheet";
import { MenuItem, MenuDivider } from "./Menu";
import { Button } from "./Button";
import { Stepper } from "./Stepper";

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

/**
 * 폼을 담는 시트. 메뉴와 달리 내용이 자기 여백을 갖고 있지 않아
 * `contentPadding` 으로 좌우를 넓히고, 넓은 화면에서는 `maxWidth` 로 잡아 둔다.
 */
export const Form: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [count, setCount] = useState(2);
    return (
      <>
        <Button onClick={() => setOpen(true)}>결제 시트 열기</Button>
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          contentPadding="0 16px 8px"
          maxWidth={760}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="text-heading-sm" style={{ color: "var(--color-text-default)" }}>
                참여 인원 선택
              </span>
              <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
                구로 숨은 맛집 투어 · 3월 23일 (토)
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span className="text-label-lg" style={{ color: "var(--color-text-default)" }}>
                참여 인원
              </span>
              <Stepper label="참여 인원" value={count} onChange={setCount} min={1} max={4} />
            </div>
            <Button style={{ width: "100%" }} size="lg" onClick={() => setOpen(false)}>
              {(35000 * count).toLocaleString("ko-KR")}원 결제하기
            </Button>
          </div>
        </BottomSheet>
      </>
    );
  },
};
