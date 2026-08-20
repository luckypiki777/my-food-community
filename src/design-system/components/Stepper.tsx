"use client";

import { Icon } from "../Icon";

export type StepperProps = {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** 스크린리더가 읽을 이름. "참여 인원" 처럼 무엇을 세는지 적는다. */
  label: string;
  /** 값 뒤에 붙는 단위. 숫자만 보이는 화면과 달리 낭독은 "2명" 이 자연스럽다. */
  unit?: string;
};

const BOX = 36;

/**
 * 숫자를 하나씩 올리고 내리는 컨트롤.
 *
 * 경계(min/max)에서는 버튼이 비활성이 된다. 눌리지만 값이 안 변하면
 * 왜 안 되는지 알 수 없어서, 옆에 남은 수량 안내를 두는 화면과 짝을 이룬다.
 */
export function Stepper({ value, onChange, min = 1, max = 99, label, unit }: StepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
    >
      <RoundButton
        ariaLabel={`${label} 줄이기`}
        disabled={atMin}
        onClick={() => onChange?.(value - 1)}
      >
        <span
          aria-hidden
          style={{
            width: 12,
            height: 2,
            borderRadius: 1,
            background: "var(--color-text-default)",
          }}
        />
      </RoundButton>

      <span
        className="text-heading-sm"
        aria-live="polite"
        style={{
          minWidth: BOX,
          textAlign: "center",
          color: "var(--color-text-default)",
        }}
      >
        {value}
        {unit}
      </span>

      <RoundButton
        ariaLabel={`${label} 늘리기`}
        disabled={atMax}
        onClick={() => onChange?.(value + 1)}
      >
        <Icon name="plus" size={20} color="var(--color-text-default)" />
      </RoundButton>
    </div>
  );
}

function RoundButton({
  children,
  ariaLabel,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: BOX,
        height: BOX,
        flexShrink: 0,
        padding: 0,
        borderRadius: BOX / 2,
        border: "1px solid var(--color-border-strong)",
        background: "transparent",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
