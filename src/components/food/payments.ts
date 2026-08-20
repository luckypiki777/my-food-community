/**
 * 강연·모임 결제 화면(배너 · 상세 · 결제 · 내역)이 쓰는 값.
 *
 * **상품은 이제 DB 에서 온다** — `product` 테이블 → `/api/products` → `useProducts.ts`.
 * 여기 남은 건 두 가지다:
 *  1) 주문·취소·영수증. 아직 `payment` 테이블에 배선하지 않아서 화면 상태로만 흐른다.
 *  2) `product` 에 대응하는 컬럼이 없는 화면 문구(아래 상수들).
 *
 * 주문 쪽도 테이블이 붙으면 `useProducts.ts` 처럼 훅 하나로 갈아끼운다 —
 * 화면은 아래 타입만 보고 있으므로 그 밑만 바뀐다.
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
 * 상품별로 다를 값이지만 컬럼이 없다. 규정이 상품마다 갈라지면 컬럼으로 옮긴다.
 */
export const REFUND_POLICY = "행사 7일 전까지 전액 환불 · 3일 전까지 50% 환불";

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
  id: string;
  productName: string;
  thumbnail: string;
  status: OrderStatus;
  /** 행사 일시. 카드 가운데 줄. */
  when: string;
  headcount: number;
  amount: number;
  paidAt: string;
  /** 취소 버튼을 걸 수 있는지. 기한이 지나면 안내 문구로 바뀐다. */
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
  /** 환불이 아직 안 끝난 건에만 붙는 안내. */
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

/** 방금 끝난 결제를 결제 내역의 한 줄로 만든다. */
export function orderFromReceipt(receipt: Receipt, paidAt: Date): Order {
  return {
    id: receipt.orderNumber,
    productName: receipt.productName,
    thumbnail: receipt.thumbnail,
    status: "paid",
    when: receipt.when,
    headcount: receipt.headcount,
    amount: receipt.amount,
    paidAt: formatDate(paidAt),
    cancellable: true,
  };
}

/** 결제 취소. 지금은 전액 환불로만 다룬다 — 부분 환불 규정은 결제사가 붙은 뒤에 온다. */
export function cancellationFromOrder(order: Order, cancelledAt: Date): Cancellation {
  return {
    id: order.id,
    productName: order.productName,
    thumbnail: order.thumbnail,
    status: "refunding",
    when: order.when,
    headcount: order.headcount,
    cancelledAt: formatDate(cancelledAt),
    paidAmount: order.amount,
    refundAmount: order.amount,
    note: "카드사에 따라 3~5영업일이 걸릴 수 있어요",
  };
}

/** 내역 카드가 쓰는 날짜 표기: 2026.03.02 */
function formatDate(date: Date): string {
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

/** 마이 · 결제 내역 탭. */
export const ORDERS: Order[] = [
  {
    id: "GR-20260323-0417",
    productName: "구로 숨은 맛집 투어",
    thumbnail:
      "https://images.unsplash.com/photo-1624176193860-dd7866e5a8aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    status: "paid",
    when: "3월 23일 (토) 오후 2시",
    headcount: 2,
    amount: 70000,
    paidAt: "2026.03.02",
    cancellable: true,
  },
  {
    id: "GR-20260214-0208",
    productName: "동네 사장님 이야기 밤",
    thumbnail:
      "https://images.unsplash.com/photo-1606509036992-4399d5c5afe4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    status: "used",
    when: "2월 14일 (수) 오후 7시",
    headcount: 1,
    amount: 20000,
    paidAt: "2026.02.01",
    cancellable: false,
  },
];

/** 마이 · 취소 내역 탭. */
export const CANCELLATIONS: Cancellation[] = [
  {
    id: "GR-20260214-0109",
    productName: "동네 사장님 이야기 밤",
    thumbnail:
      "https://images.unsplash.com/photo-1558884903-bbe59d6285ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    status: "refunding",
    when: "2월 14일 (수) 오후 7시",
    headcount: 2,
    cancelledAt: "2026.02.05",
    paidAmount: 40000,
    refundAmount: 40000,
    note: "카드사에 따라 3~5영업일이 걸릴 수 있어요",
  },
  {
    id: "GR-20260120-0033",
    productName: "구로 골목 사진 산책",
    thumbnail:
      "https://images.unsplash.com/photo-1606247919215-3ce82d2e45d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    status: "refunded",
    when: "1월 20일 (토) 오후 3시",
    headcount: 1,
    cancelledAt: "2026.01.11",
    paidAmount: 25000,
    refundAmount: 25000,
  },
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "결제 완료",
  used: "이용 완료",
};

export const CANCEL_STATUS_LABEL: Record<CancelStatus, string> = {
  refunding: "환불 진행 중",
  refunded: "취소 완료",
};
