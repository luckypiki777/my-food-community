import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Empty } from "./Empty";

const meta: Meta<typeof Empty> = {
  title: "Components/Others/Empty",
  component: Empty,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Empty>;

export const Full: Story = {
  args: {
    icon: "search",
    title: "검색 결과가 없어요",
    description: "필터나 검색어를 바꿔서 다시 찾아보세요.",
    primaryAction: { label: "필터 초기화" },
    secondaryAction: { label: "전체 보기" },
  },
};

export const TitleOnly: Story = {
  args: {
    icon: "heart",
    title: "저장한 맛집이 없어요",
  },
};

export const NoBorder: Story = {
  args: {
    icon: "image",
    title: "아직 등록된 맛집이 없어요",
    description: "첫 번째 숨은 맛집을 등록해 보세요.",
    primaryAction: { label: "맛집 등록하기" },
    bordered: false,
  },
};
