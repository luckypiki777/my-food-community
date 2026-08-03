import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextField, type FieldSize } from "./TextField";
import { ICON_NAMES } from "../tokens";

const meta: Meta<typeof TextField> = {
  title: "Components/Form/TextField",
  component: TextField,
  parameters: { layout: "centered" },
  args: {
    label: "맛집 이름",
    placeholder: "예: 구로동 김밥천국",
    helperText: "20자 이내로 입력하세요",
    size: "md",
    leftIcon: "search",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    leftIcon: { control: "select", options: [undefined, ...ICON_NAMES] },
    rightIcon: { control: "select", options: [undefined, ...ICON_NAMES] },
    type: { control: "inline-radio", options: ["text", "password"] },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TextField>;

export const Playground: Story = {};

const SIZES: FieldSize[] = ["lg", "md", "sm"];

export const States: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div
      style={{
        padding: 32,
        background: "var(--color-background-default)",
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "repeat(3, 240px)",
        gap: 28,
      }}
    >
      {SIZES.map((size) => (
        <div key={size} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
            size {size}
          </span>
          <TextField size={size} label="Default" placeholder="Placeholder" helperText="Helper text" leftIcon="user" />
          <TextField size={size} label="Filled" defaultValue="입력된 텍스트" helperText="Helper text" leftIcon="user" />
          <TextField size={size} label="Disabled" defaultValue="Disabled" disabled leftIcon="user" />
          <TextField size={size} label="Error" defaultValue="Invalid text" errorMessage="필수 항목입니다" leftIcon="user" />
        </div>
      ))}
    </div>
  ),
};
