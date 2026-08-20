import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Stepper } from "./Stepper";

const meta: Meta<typeof Stepper> = {
  title: "Components/Form/Stepper",
  component: Stepper,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Stepper>;

export const Playground: Story = {
  render: () => {
    const [count, setCount] = useState(2);
    return <Stepper label="참여 인원" value={count} onChange={setCount} min={1} max={4} />;
  },
};

export const States: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 32, background: "var(--color-background-default)", minHeight: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {[
          { title: "기본", value: 2, min: 1, max: 4 },
          { title: "최소값 (줄이기 비활성)", value: 1, min: 1, max: 4 },
          { title: "최대값 (늘리기 비활성)", value: 4, min: 1, max: 4 },
        ].map((s) => (
          <div key={s.title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 className="text-heading-sm" style={{ margin: 0 }}>
              {s.title}
            </h3>
            <Stepper label="참여 인원" value={s.value} min={s.min} max={s.max} />
          </div>
        ))}
      </div>
    </div>
  ),
};

/** 폼 한 줄로 쓰는 모습 — 라벨은 왼쪽, 컨트롤은 오른쪽 끝. */
export const InRow: Story = {
  parameters: { layout: "fullscreen" },
  render: () => {
    const [count, setCount] = useState(2);
    return (
      <div style={{ padding: 32, background: "var(--color-background-default)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 328,
          }}
        >
          <span className="text-label-lg" style={{ color: "var(--color-text-default)" }}>
            참여 인원
          </span>
          <Stepper label="참여 인원" value={count} onChange={setCount} min={1} max={4} />
        </div>
      </div>
    );
  },
};
