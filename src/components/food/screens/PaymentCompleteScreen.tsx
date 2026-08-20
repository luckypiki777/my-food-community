"use client";

import { TopNavigation } from "@/design-system/components/TopNavigation";
import { Button } from "@/design-system/components/Button";
import { Empty } from "@/design-system/components/Empty";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, Container, READ_MAX } from "../shell";
import { formatWon, type Receipt } from "../payments";
import type { AppNav } from "../types";

export function PaymentCompleteScreen({
  receipt,
  nav,
}: {
  receipt: Receipt | null;
  nav: AppNav;
}) {
  return (
    <Screen>
      {/* 되돌아갈 곳이 없는 화면이라 톱바에 뒤로 가기를 두지 않는다.
          다음 걸음은 아래 두 버튼이 정한다. */}
      <StickyHeader maxWidth={READ_MAX}>
        <TopNavigation title="결제 완료" />
      </StickyHeader>

      {!receipt ? (
        <Container maxWidth={READ_MAX} style={{ paddingTop: 40 }}>
          <Empty
            icon="error"
            title="결제 내역을 찾지 못했어요"
            description="마이 · 결제 내역에서 확인해 주세요"
          />
        </Container>
      ) : (
        <Container maxWidth={READ_MAX} style={{ paddingTop: 32, paddingBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  background: "var(--color-background-success-subtle)",
                }}
              >
                <Icon name="check" size={32} color="var(--color-text-success)" />
              </span>
              <h1
                className="text-heading-lg"
                style={{ color: "var(--color-text-default)", margin: 0, textAlign: "center" }}
              >
                결제가 완료되었어요
              </h1>
              <p
                className="text-body-md"
                style={{
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                신청 내역을 이메일로도 보내 드렸어요
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                borderRadius: 14,
                border: "1px solid var(--color-border-default)",
              }}
            >
              <ReceiptRow label="상품명" value={receipt.productName} />
              <ReceiptRow label="일시" value={receipt.when} />
              <ReceiptRow label="장소" value={receipt.place} />
              <ReceiptRow label="참여 인원" value={`${receipt.headcount}명`} />

              <div style={{ height: 1, background: "var(--color-border-default)" }} />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span className="text-label-lg" style={{ color: "var(--color-text-default)" }}>
                  결제 금액
                </span>
                <span className="text-heading-md" style={{ color: "var(--color-text-brand)" }}>
                  {formatWon(receipt.amount)}
                </span>
              </div>

              <ReceiptRow label="결제 수단" value={receipt.method} small />
              <ReceiptRow label="주문 번호" value={receipt.orderNumber} small />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Button
                variant="primary"
                size="lg"
                style={{ width: "100%" }}
                onClick={() => nav.openMyTab("orders")}
              >
                결제 내역 보기
              </Button>
              <Button
                variant="secondary"
                size="lg"
                style={{ width: "100%" }}
                onClick={() => nav.navigate("main")}
              >
                맛집 목록으로
              </Button>
            </div>
          </div>
        </Container>
      )}
    </Screen>
  );
}

function ReceiptRow({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span
        className="text-label-md"
        style={{ color: "var(--color-text-subtle)", whiteSpace: "nowrap" }}
      >
        {label}
      </span>
      <span
        className={small ? "text-label-md" : "text-body-md"}
        style={{
          flex: 1,
          textAlign: "right",
          color: small ? "var(--color-text-secondary)" : "var(--color-text-default)",
          wordBreak: "keep-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
