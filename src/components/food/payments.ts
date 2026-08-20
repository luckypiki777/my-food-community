/**
 * 강연·모임 결제 화면(배너 · 상세 · 결제 · 내역)이 쓰는 값.
 *
 * **상품도 결제 내역도 이제 DB 에서 온다** — 상품은 `product` → `/api/products` →
 * `useProducts.ts`, 결제·취소 내역은 `payment` 원장 → `/api/payments` →
 * `usePayments.ts`. 여기 남은 건 두 가지다:
 *  1) 화면이 쓰는 타입과 상태 문구(아래 `Order` · `Cancellation` · 라벨).
 *  2) `product` 에 대응하는 컬럼이 없는 화면 문구(아래 상수들).
 *
 * 규칙의 원본은 `rules/payment.md` 다.
 */

/**
 * 상품 분류. 상세 톱바 제목과 배너 뱃지에 쓴다.
 *
 * `product` 에 분류 컬럼이 없다. 지금 파는 게 강연·모임 한 갈래뿐이라 고정값으로 둔다.
 * 갈래가 늘면 컬럼을 만들고 여기를 지운다.
 */
export const PRODUCT_CATEGORY = "강연·모임";

/** 상세 본문 섹션 제목. 본문(`description`)은 DB 에서 오지만 이 제목은 컬럼이 없다. */
export const DESCRIPTION_TITLE = "이런 모임이에요";

/**
 * 취소·환불 규정 한 줄 요약. 상세 하단과 결제 시트가 같이 쓴다.
 *
 * **코드가 실제로 강제하는 것과 같은 값이어야 한다** — `src/lib/bff/paymentHistory.ts` 의
 * `isCancellable()`. 문구는 아무것도 막지 못하므로, 둘이 어긋나면 안내와 실제 동작이
 * 갈라진다(전에는 "3일 전까지 50% 환불" 이라고 적혀 있었지만 부분 환불은 구현된 적이
 * 없다). 부분 환불을 열려면 금액 계산 규칙을 `rules/payment.md` 에 먼저 적는다.
 *
 * 상품별로 다를 값이지만 컬럼이 없다. 규정이 상품마다 갈라지면 컬럼으로 옮긴다.
 */
export const REFUND_POLICY = "행사 시작 전까지 전액 환불";

/**
 * 한 번에 신청할 수 있는 최대 인원.
 *
 * 이것도 컬럼이 없다. 정원과 같이 낮은 쪽이 실제 상한이 된다.
 *
 * **BFF 에 같은 값이 있다** — `src/lib/bff/payment.ts` 의 `MAX_PER_ORDER`.
 * 화면은 왕복을 아끼려고 미리 걸러 보고, 최종 판정은 서버가 한다
 * (맛집 등록의 `place.ts` ↔ `RegisterScreen` 과 같은 규약). 한쪽만 바꾸면 안 된다.
 */
export const MAX_PER_ORDER = 4;

export type OrderStatus = "paid" | "used";

export type Order = {
  /** 주문 번호 = 포트원 paymentId = `payment.transction_key`. 셋은 같은 값이다. */
  id: string;
  productName: string;
  thumbnail: string;
  status: OrderStatus;
  /** 행사 일시. 카드 가운데 줄. */
  when: string;
  headcount: number;
  amount: number;
  paidAt: string;
  /** 취소 버튼을 걸 수 있는지. **판정은 서버가 한다**(`isCancellable`). */
  cancellable: boolean;
};

export type CancelStatus = "refunding" | "refunded";

export type Cancellation = {
  id: string;
  productName: string;
  thumbnail: string;
  status: CancelStatus;
  when: string;
  headcount: number;
  cancelledAt: string;
  paidAmount: number;
  refundAmount: number;
  /** 환불이 어떻게 진행되는지 알려 주는 한 줄. */
  note?: string;
};

/** 결제가 끝난 뒤 완료 화면이 받아 그리는 영수증. */
export type Receipt = {
  orderNumber: string;
  productName: string;
  when: string;
  place: string;
  headcount: number;
  amount: number;
  method: string;
  /** 결제 내역 카드에 그대로 쓰는 상품 사진. */
  thumbnail: string;
};

/** 내역 카드가 쓰는 날짜 표기: 2026.03.02 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join(".");
}

/** 35000 → "35,000원". 화면 어디서나 같은 표기를 쓴다. */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "결제 완료",
  used: "이용 완료",
};

export const CANCEL_STATUS_LABEL: Record<CancelStatus, string> = {
  refunding: "환불 진행 중",
  refunded: "취소 완료",
};
