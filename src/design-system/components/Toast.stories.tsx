import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toast, type ToastType } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "Components/Feedback/Toast",
  component: Toast,
  parameters: { layout: "centered" },
  args: { type: "info", message: "A new software update is available.", showClose: true },
  argTypes: {
    type: { control: "inline-radio", options: ["success", "error", "info", "warning"] },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Toast>;

export const Playground: Story = {};

const MESSAGES: Record<ToastType, string> = {
  success: "변경사항이 저장되었습니다.",
  error: "문제가 발생했습니다. 다시 시도해 주세요.",
  info: "새로운 업데이트가 있습니다.",
  warning: "세션이 곧 만료됩니다.",
};

export const AllTypes: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16, width: 432 }}>
      {(["success", "error", "info", "warning"] as ToastType[]).map((t) => (
        <Toast key={t} type={t} message={MESSAGES[t]} />
      ))}
      <Toast type="success" message="닫기 버튼 없음" showClose={false} />
    </div>
  ),
};
