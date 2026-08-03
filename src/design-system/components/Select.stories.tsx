import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select, SelectItem } from "./Select";

const OPTIONS = [
  { value: "korean", label: "한식" },
  { value: "japanese", label: "일식" },
  { value: "western", label: "양식" },
  { value: "chinese", label: "중식" },
  { value: "cafe", label: "카페 · 디저트" },
];

const meta: Meta<typeof Select> = {
  title: "Components/Form/Select",
  component: Select,
  parameters: { layout: "centered" },
  args: { label: "카테고리", placeholder: "카테고리를 선택하세요", options: OPTIONS, size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Playground: Story = { args: { helperText: "하나를 선택하세요" } };

export const Selected: Story = { args: { defaultValue: "korean" } };

export const ErrorState: Story = {
  args: { errorMessage: "카테고리를 선택해주세요" },
};

export const Disabled: Story = { args: { disabled: true, defaultValue: "korean" } };

export const Items: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh", width: 320 }}>
      <h3 className="text-heading-sm" style={{ marginBottom: 12 }}>Select Item states</h3>
      <div style={{ border: "1px solid var(--color-border-default)", borderRadius: 8, padding: "4px 0", background: "var(--color-background-surface)" }}>
        <SelectItem label="Default" />
        <SelectItem label="Selected" selected />
        <SelectItem label="Disabled" disabled />
      </div>
    </div>
  ),
};
