"use client";

import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import {
  CANCEL_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  formatWon,
  type Cancellation,
  type Order,
} from "./payments";

/** 마이 · 결제 내역 카드. 취소 기한이 지난 건은 버튼 대신 이유가 남는다. */
export function OrderCard({
  order,
  onCancel,
}: {
  order: Order;
  onCancel?: (order: Order) => void;
}) {
  return (
    <article style={CARD}>
      <div style={{ display: "flex", gap: 12 }}>
        <Thumbnail src={order.thumbnail} alt={order.productName} />

        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="text-label-lg"
              style={{ flex: 1, minWidth: 0, color: "var(--color-text-default)" }}
            >
              {order.productName}
            </span>
            <Badge type={order.status === "paid" ? "success" : "neutral"}>
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
            {order.when}
          </span>
          <span className="text-body-md" style={{ color: "var(--color-text-default)" }}>
            {order.headcount}명 · {formatWon(order.amount)}
          </span>
        </div>
      </div>

      <div style={DIVIDER} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
          결제일 {order.paidAt}
        </span>
        {order.cancellable ? (
          <Button variant="secondary" size="sm" onClick={() => onCancel?.(order)}>
            결제 취소
          </Button>
        ) : (
          <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
            취소 기한이 지났어요
          </span>
        )}
      </div>
    </article>
  );
}

/** 마이 · 취소 내역 카드. 결제한 금액과 실제로 돌려받는 금액을 나란히 둔다. */
export function CancellationCard({ cancellation }: { cancellation: Cancellation }) {
  return (
    <article style={CARD}>
      <div style={{ display: "flex", gap: 12 }}>
        {/* 이미 지나간 건이라 사진을 한 톤 죽인다. */}
        <Thumbnail src={cancellation.thumbnail} alt={cancellation.productName} dimmed />

        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="text-label-lg"
              style={{ flex: 1, minWidth: 0, color: "var(--color-text-default)" }}
            >
              {cancellation.productName}
            </span>
            <Badge type={cancellation.status === "refunding" ? "info" : "neutral"}>
              {CANCEL_STATUS_LABEL[cancellation.status]}
            </Badge>
          </div>
          <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
            {cancellation.when} · {cancellation.headcount}명
          </span>
          <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
            취소일 {cancellation.cancelledAt}
          </span>
        </div>
      </div>

      <div style={DIVIDER} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={ROW}>
          <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
            결제 금액
          </span>
          <span className="text-label-md" style={{ color: "var(--color-text-secondary)" }}>
            {formatWon(cancellation.paidAmount)}
          </span>
        </div>
        <div style={ROW}>
          <span className="text-label-lg" style={{ color: "var(--color-text-default)" }}>
            환불 금액
          </span>
          <span className="text-label-lg" style={{ color: "var(--color-text-brand)" }}>
            {formatWon(cancellation.refundAmount)}
          </span>
        </div>
      </div>

      {cancellation.note && (
        <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
          {cancellation.note}
        </span>
      )}
    </article>
  );
}

function Thumbnail({ src, alt, dimmed = false }: { src: string; alt: string; dimmed?: boolean }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 10,
        objectFit: "cover",
        display: "block",
        opacity: dimmed ? 0.6 : 1,
        background: "var(--color-background-muted)",
      }}
    />
  );
}

const CARD = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid var(--color-border-default)",
  background: "var(--color-background-surface)",
} as const;

const DIVIDER = { height: 1, background: "var(--color-border-subtle)" } as const;

const ROW = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
} as const;
