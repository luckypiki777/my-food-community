import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Modal } from "./Modal";
import { Button } from "./Button";

const meta: Meta<typeof Modal> = {
  title: "Components/Others/Modal",
  component: Modal,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Modal>;

export const Confirm: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>모달 열기</Button>
        <Modal
          open={open}
          title="맛집 글을 삭제할까요?"
          description="이 작업은 되돌릴 수 없어요. 등록한 사진과 내용이 모두 삭제됩니다."
          onClose={() => setOpen(false)}
          secondaryAction={{ label: "취소", onClick: () => setOpen(false) }}
          primaryAction={{ label: "삭제", variant: "destructive", onClick: () => setOpen(false) }}
        />
      </>
    );
  },
};

export const Simple: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>모달 열기</Button>
        <Modal
          open={open}
          title="알림"
          description="변경사항이 저장되었습니다."
          onClose={() => setOpen(false)}
          primaryAction={{ label: "확인", onClick: () => setOpen(false) }}
        />
      </>
    );
  },
};
