import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileUploader } from "./FileUploader";

const meta: Meta<typeof FileUploader> = {
  title: "Components/Form/FileUploader",
  component: FileUploader,
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
type Story = StoryObj<typeof FileUploader>;

export const Default: Story = {};

export const WithFiles: Story = {
  args: {
    items: [
      { id: "1", name: "kimbap-heaven.jpg", status: "complete" },
      { id: "2", name: "uploading-photo.png", status: "uploading" },
      { id: "3", name: "too-large-file.png", status: "error" },
    ],
  },
};

export const ErrorState: Story = { args: { error: true } };

export const Disabled: Story = { args: { disabled: true } };
