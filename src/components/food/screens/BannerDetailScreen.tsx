"use client";

import { useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { BottomSheet } from "@/design-system/components/BottomSheet";
import { Stepper } from "@/design-system/components/Stepper";
import { Empty } from "@/design-system/components/Empty";
import { Spinner } from "@/design-system/components/Spinner";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, FixedBottom, Container, READ_MAX, GUTTER } from "../shell";
import {
  DESCRIPTION_TITLE,
  MAX_PER_ORDER,
  PRODUCT_CATEGORY,
  REFUND_POLICY,
  formatWon,
} from "../payments";
import { ProductImage } from "../ProductImage";
import { formatEventAt, formatEventDate, useProductDetail, type ProductDetail } from "../useProducts";
import { receiptFrom, usePayment, type PayOutcome } from "../usePayments";
import type { AppNav } from "../types";

const HERO_HEIGHT = "clamp(200px, 40vw, 320px)";
/** 디자인은 160. 본문 폭이 넓어지면 사진도 같이 커진다. */
const DESC_IMAGE_HEIGHT = "clamp(160px, 24vw, 240px)";

export function BannerDetailScreen({
  productId,
  nav,
}: {
  productId: string | null;
  nav: AppNav;
}) {
  const { product, status } = useProductDetail(productId);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 설정은 결제 시트를 열기 전에 미리 받아 둔다. 버튼을 누른 뒤에 받으면 결제창이
  // 뜨기까지 한 박자 비고, 키가 없다는 사실도 그때서야 알게 된다.
  const payment = usePayment();

  const header = (
    <StickyHeader maxWidth={READ_MAX}>
      <TopNavigation
        title={PRODUCT_CATEGORY}
        leftIcon="arrow-left"
        onLeftClick={() => nav.navigate("main")}
      />
    </StickyHeader>
  );

  if (status === "loading") {
    return (
      <Screen>
        {header}
        <Container maxWidth={READ_MAX} style={{ paddingTop: 80, textAlign: "center" }}>
          <Spinner size={28} />
        </Container>
      </Screen>
    );
  }

  // 못 찾은 것과 못 불러온 것을 한 화면으로 다룬다. 어느 쪽이든 사용자가 할 수 있는 건
  // 뒤로 가는 것뿐이라 굳이 갈라 봐야 알려 줄 게 없다.
  if (!product) {
    return (
      <Screen>
        {header}
        <Container maxWidth={READ_MAX} style={{ paddingTop: 40 }}>
          <Empty
            icon="error"
            title="상품을 찾지 못했어요"
            description="배너가 내려갔거나 잠시 문제가 생겼어요"
          />
        </Container>
      </Screen>
    );
  }

  // 1회 신청 상한과 정원 중 낮은 쪽이 실제 상한이다.
  const maxCount = Math.max(1, Math.min(MAX_PER_ORDER, product.capacity));

  // 결제 설정을 못 받았으면 결제창을 띄울 수 없다. 판매 종료와 이유가 다르므로
  // 문구도 따로 둔다 — 눌리는데 아무 일도 안 일어나는 버튼보다 낫다.
  // 판매 종료가 먼저다. 둘 다일 때 사용자에게 더 중요한 사실은 "이 상품은 이제
  // 못 산다" 는 쪽이지, 우리 쪽 설정 사정이 아니다.
  const payable = product.onSale && payment.status !== "unavailable";
  const buttonLabel = !product.onSale
    ? "판매 종료"
    : payment.status === "unavailable"
      ? "결제 준비 중"
      : "결제하기";

  const handleOutcome = (outcome: PayOutcome) => {
    // 리다이렉트 갈래는 페이지가 떠나는 중이다. 여기서 할 일이 없다.
    if (outcome.status === "redirected") return;
    if (outcome.status === "failed") {
      nav.toast(outcome.message, "error");
      return;
    }
    setSheetOpen(false);
    nav.completePayment(receiptFrom(outcome.receipt));
  };

  return (
    <Screen hasBottomBar>
      {header}

      <Container maxWidth={READ_MAX} padded={false}>
        <ProductImage
          image={product.bannerImage}
          alt={product.name}
          style={{
            display: "block",
            width: "100%",
            height: HERO_HEIGHT,
            objectFit: "cover",
            background: "var(--color-background-muted)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            padding: `20px ${GUTTER}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Badge type={product.onSale ? "success" : "neutral"}>
                {product.onSale ? "판매 중" : "판매 종료"}
              </Badge>
              <Badge>정원 {product.capacity}명</Badge>
            </div>
            <h1
              className="text-heading-lg"
              style={{ color: "var(--color-text-default)", margin: 0 }}
            >
              {product.name}
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 16,
              borderRadius: 14,
              background: "var(--color-background-subtle)",
            }}
          >
            <InfoRow icon="calendar" label="일시" value={formatEventAt(product.eventAt)} />
            <InfoRow icon="map-pin" label="장소" value={product.address} />
            <InfoRow icon="user" label="정원" value={`${product.capacity}명`} />
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2
              className="text-heading-sm"
              style={{ color: "var(--color-text-default)", margin: 0 }}
            >
              {DESCRIPTION_TITLE}
            </h2>
            <p
              className="text-body-md"
              style={{ color: "var(--color-text-secondary)", margin: 0 }}
            >
              {product.description}
            </p>
            <ProductImage
              image={product.detailImage}
              alt=""
              style={{
                display: "block",
                width: "100%",
                height: DESC_IMAGE_HEIGHT,
                objectFit: "cover",
                borderRadius: 14,
                background: "var(--color-background-muted)",
              }}
            />
          </section>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--color-border-default)",
            }}
          >
            <Icon name="info" size={20} color="var(--color-text-subtle)" />
            <span
              className="text-label-md"
              style={{ flex: 1, color: "var(--color-text-subtle)" }}
            >
              {REFUND_POLICY}
            </span>
          </div>
        </div>
      </Container>

      <FixedBottom maxWidth={READ_MAX}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: `12px ${GUTTER} 16px`,
            background: "var(--color-background-surface)",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="text-heading-md" style={{ color: "var(--color-text-default)" }}>
              {formatWon(product.price)}
            </span>
            <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
              1인 · 정원 {product.capacity}명
            </span>
          </div>
          <Button
            variant="primary"
            size="lg"
            style={{ flex: 1 }}
            disabled={!payable}
            onClick={() => setSheetOpen(true)}
          >
            {buttonLabel}
          </Button>
        </div>
      </FixedBottom>

      {/* 열려 있을 때만 마운트한다. 닫으면 고르던 인원이 처음 값으로 돌아간다. */}
      {sheetOpen && (
        <PaymentSheet
          product={product}
          maxCount={maxCount}
          pending={payment.pending}
          onClose={() => setSheetOpen(false)}
          onPay={async (headcount, totalAmount) => {
            const userId = nav.user?.id;
            if (!userId) {
              nav.toast("로그인이 필요해요", "error");
              return;
            }
            handleOutcome(
              await payment.pay({
                productId: product.id,
                userId,
                // 주문명은 상품명 그대로다. 서버가 포트원에서 받은 주문명을 DB 의
                // 상품명과 글자 그대로 맞춰 보므로 여기서 인원 따위를 덧붙이면 안 된다.
                orderName: product.name,
                headcount,
                totalAmount,
              }),
            );
          }}
        />
      )}
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: "calendar" | "map-pin" | "user";
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={20} color="var(--color-text-muted)" />
      <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
        {label}
      </span>
      <span
        className="text-body-md"
        style={{ flex: 1, textAlign: "right", color: "var(--color-text-default)" }}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentSheet({
  product,
  maxCount,
  pending,
  onClose,
  onPay,
}: {
  product: ProductDetail;
  maxCount: number;
  /** 결제창이 떠 있는 동안. 같은 결제를 두 번 걸지 않도록 버튼을 잠근다. */
  pending: boolean;
  onClose: () => void;
  onPay: (headcount: number, totalAmount: number) => void;
}) {
  const [count, setCount] = useState(Math.min(2, maxCount));
  const total = product.price * count;

  return (
    <BottomSheet open onClose={onClose} contentPadding="0 16px 8px" maxWidth={READ_MAX}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="text-heading-sm" style={{ color: "var(--color-text-default)" }}>
            참여 인원 선택
          </span>
          <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
            {product.name} · {formatEventDate(product.eventAt)}
          </span>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span className="text-label-lg" style={{ color: "var(--color-text-default)" }}>
            참여 인원
          </span>
          <Stepper label="참여 인원" value={count} onChange={setCount} min={1} max={maxCount} />
        </div>

        <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
          최대 {maxCount}명까지 신청할 수 있어요
        </span>

        <div style={{ height: 1, background: "var(--color-border-default)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SheetRow label="1인 가격" value={formatWon(product.price)} />
          <SheetRow label="참여 인원" value={`${count}명`} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 6,
            }}
          >
            <span className="text-label-lg" style={{ color: "var(--color-text-default)" }}>
              총 결제 금액
            </span>
            <span className="text-heading-lg" style={{ color: "var(--color-text-brand)" }}>
              {formatWon(total)}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 10,
            background: "var(--color-background-subtle)",
          }}
        >
          <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
            취소·환불 규정
          </span>
          <span
            className="text-label-md"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              color: "var(--color-text-secondary)",
            }}
          >
            전문 보기
            <Icon name="chevron-right" size={16} color="var(--color-text-muted)" />
          </span>
        </div>

        <Button
          variant="primary"
          size="lg"
          style={{ width: "100%" }}
          disabled={pending}
          onClick={() => onPay(count, total)}
        >
          {pending ? "결제창을 여는 중…" : `${formatWon(total)} 결제하기`}
        </Button>
      </div>
    </BottomSheet>
  );
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
        {label}
      </span>
      <span className="text-body-md" style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}
