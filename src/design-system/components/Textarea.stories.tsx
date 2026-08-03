import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
  title: "Components/Form/Textarea",
  component: Textarea,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Playground: Story = {
  render: () => {
    const [v, setV] = useState("");
    return (
      <Textarea
        label="맛집 소개"
        placeholder="이 맛집을 소개해 주세요"
        helperText="방문 경험을 자유롭게 적어주세요"
        showCounter
        maxLength={200}
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
    );
  },
};

export const States: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div
      style={{
        padding: 32,
        background: "var(--color-background-default)",
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "repeat(3, 320px)",
        gap: 24,
      }}
    >
      <Textarea label="Default" placeholder="Placeholder" helperText="Helper text" />
      <Textarea label="Disabled" defaultValue="Disabled content" disabled />
      <Textarea label="Error" defaultValue="Invalid content" errorMessage="내용을 입력하세요" />
    </div>
  ),
};
