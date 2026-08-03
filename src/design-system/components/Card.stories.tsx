import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "./Card";
import { Badge } from "./Badge";

const meta: Meta<typeof Card> = {
  title: "Components/Others/Card",
  component: Card,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const WithImage: Story = {
  args: {
    imageSrc: "/samples/food-1.png",
    imageAlt: "산채비빔밥",
    title: "구로동 산채비빔밥",
    description: "제철 나물과 직접 만든 고추장으로 비벼 먹는 건강한 한 그릇.",
  },
};

export const NoImage: Story = {
  args: {
    title: "이름 없는 골목 국숫집",
    description: "간판도 없는 노포. 멸치 육수 잔치국수가 이 동네 최고입니다.",
  },
};

export const CustomBody: Story = {
  render: () => (
    <Card imageSrc="/samples/food-2.png" imageAlt="한정식">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-heading-sm">가정식 한상</span>
          <Badge type="success">영업중</Badge>
        </div>
        <span className="text-body-md" style={{ color: "var(--color-text-secondary)" }}>
          매일 바뀌는 반찬과 갓 지은 밥. 점심에만 문을 엽니다.
        </span>
      </div>
    </Card>
  ),
};
