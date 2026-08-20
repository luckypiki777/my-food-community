import "server-only";

import { badRequest, invalid, type Parsed } from "@/lib/bff/response";
import { productImageUrl } from "@/lib/supabase/storage";

import {
  PAYMENT_TYPE,
  formatPayMethod,
  type PaymentDb,
  type PortonePayment,
  type ProductSnapshot,
} from "./payment";

/**
 * 마이 · 결제 내역 / 취소 내역이 읽는 원장.
 *
 * 규칙의 원본은 `rules/payment.md` 9-4 다.
 *
 * **`product` 를 조인하지 않는다.** 카드에 찍히는 상품명·일시·금액은 전부
 * `payment_snapshot` 에서 온다 — 운영자가 가격을 고치거나 상품을 내려도 지난 내역이
 * 같이 바뀌면 안 되기 때문이다. 원장이 스냅샷을 들고 있는 이유가 이것이다.
 */

/* ------------------------------------------------------------------ 상수 -- */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/**
 * 내역 한 묶음이 읽어 오는 컬럼.
 *
 * `payment_snapshot` 임베드는 FK(`payment.payment_snapshot_id`)를 타고 들어간다.
 * 그 FK 인덱스가 스냅샷 SELECT 정책의 성능 전제이기도 하다(`rules/payment.md` 8절).
 */
const LEDGER_COLUMNS =
  "transction_key, type, amount, created_at, payment_snapshot(snapshot_product, snapshot_payment)" as const;

/* ------------------------------------------------------------- 응답 모양 -- */

/**
 * 결제 내역 한 줄.
 *
 * 날짜는 전부 ISO 문자열 그대로 준다 — 한국 시간 표기를 만드는 규칙은 화면
 * (`formatEventAt`) 한 곳에만 둔다. 서버가 문구까지 만들면 같은 규칙이 두 벌이 된다.
 */
export type OrderEntry = {
  /** 주문 번호 = 포트원 paymentId = `payment.transction_key`. 셋은 같은 값이다. */
  orderNumber: string;
  productId: string;
  productName: string;
  /** 행사 일시 ISO. */
  eventAt: string;
  headcount: number;
  /** 결제 금액(양수). 원장에서는 `+` 로 쌓여 있다. */
  amount: number;
  method: string;
  thumbnail: string;
  /** 결제 시각 ISO. */
  paidAt: string;
  /** 지금 취소할 수 있는지. 판단은 서버가 한다(아래 `isCancellable`). */
  cancellable: boolean;
};

/** 취소 내역 한 줄. 같은 `transction_key` 의 결제 행과 취소 행을 합쳐 만든다. */
export type CancellationEntry = {
  orderNumber: string;
  productId: string;
  productName: string;
  eventAt: string;
  headcount: number;
  thumbnail: string;
  /** 원래 낸 돈. 결제 행의 금액이다. */
  paidAmount: number;
  /** 돌려받는 돈. 취소 행 금액의 절댓값이다(원장에는 `−` 로 쌓인다). */
  refundAmount: number;
  /** 취소 시각 ISO. */
  cancelledAt: string;
  /** 포트원이 취소를 확정했는지. 아직이면 `refunding`. */
  status: "refunding" | "refunded";
};

export type PaymentHistory = {
  orders: OrderEntry[];
  cancellations: CancellationEntry[];
  /** 더 오래된 결제가 남아 있는지. 지금은 알려만 주고 넘길 수단은 없다(아래 참고). */
  hasMore: boolean;
};

/* --------------------------------------------------------------- 취소 기한 -- */

/**
 * **취소할 수 있는 기한.** 행사가 시작되면 끝난다.
 *
 * 화면 문구(`REFUND_POLICY`)가 아니라 이 함수가 기준이다 — 문구는 아무것도 강제하지
 * 못한다. 지금은 전액 환불 한 갈래뿐이라 경계도 하나다. 부분 환불(행사 며칠 전 50% 등)을
 * 열려면 금액 계산 규칙을 `rules/payment.md` 에 먼저 적고 여기를 고친다.
 *
 * 화면 문구와 **같은 값이어야 한다** — `src/components/food/payments.ts` 의
 * `REFUND_POLICY`. 한쪽만 바꾸면 안 된다.
 */
export function isCancellable(eventAt: string, now = Date.now()): boolean {
  const at = Date.parse(eventAt);
  return Number.isNaN(at) ? false : now < at;
}

/* ------------------------------------------------------------------ 조립 -- */

/** 원장 한 행 + 그 스냅샷. PostgREST 임베드 결과를 우리 타입으로 좁힌다. */
type LedgerRow = {
  transction_key: string;
  type: string;
  amount: number | string;
  created_at: string;
  payment_snapshot: {
    snapshot_product: ProductSnapshot;
    snapshot_payment: PortonePayment;
  } | null;
};

/** 스냅샷이 없는 행은 카드를 만들 수 없다. 있을 수 없는 상태지만 터뜨리지는 않는다. */
type Snapshot = { product: ProductSnapshot; payment: PortonePayment };

function snapshotOf(row: LedgerRow): Snapshot | null {
  const snapshot = row.payment_snapshot;
  if (!snapshot?.snapshot_product || !snapshot.snapshot_payment) return null;
  return { product: snapshot.snapshot_product, payment: snapshot.snapshot_payment };
}

/** `amount` 는 numeric 이라 드라이버에 따라 문자열로 실려 온다. */
function magnitude(amount: number | string): number {
  return Math.abs(Number(amount));
}

function toOrderEntry(row: LedgerRow, snapshot: Snapshot, now: number): OrderEntry {
  const product = snapshot.product;
  return {
    orderNumber: row.transction_key,
    productId: product.id,
    productName: product.name,
    eventAt: product.event_at,
    headcount: product.headcount,
    amount: magnitude(row.amount),
    method: formatPayMethod(snapshot.payment),
    thumbnail: productImageUrl(product.image_path_main_md),
    paidAt: snapshot.payment.paidAt ?? row.created_at,
    cancellable: isCancellable(product.event_at, now),
  };
}

/**
 * 포트원이 취소를 확정했는지.
 *
 * 취소 시점의 결제 조회 응답을 스냅샷에 통째로 넣어 두므로 거기서 읽는다.
 * 비동기 취소(`CancelPending`)는 결제 상태가 아직 `PAID` 인 채로 취소 요청만 잡혀 있다.
 */
function refundStatus(payment: PortonePayment): CancellationEntry["status"] {
  return payment.status === "CANCELLED" || payment.status === "PARTIAL_CANCELLED"
    ? "refunded"
    : "refunding";
}

/**
 * 결제 행 + 취소 행 → 취소 내역 한 줄.
 *
 * 상품 정보는 **결제 시점 스냅샷**에서 가져온다. 취소 스냅샷도 같은 상품을 들고 있지만,
 * 기준을 하나로 두어야 결제 내역과 취소 내역에 같은 값이 찍힌다.
 */
export function toCancellationEntry(
  paid: { transction_key: string; amount: number | string; product: ProductSnapshot },
  cancelled: { amount: number | string; created_at: string; payment: PortonePayment },
): CancellationEntry {
  const product = paid.product;
  return {
    orderNumber: paid.transction_key,
    productId: product.id,
    productName: product.name,
    eventAt: product.event_at,
    headcount: product.headcount,
    thumbnail: productImageUrl(product.image_path_main_md),
    paidAmount: magnitude(paid.amount),
    refundAmount: magnitude(cancelled.amount),
    cancelledAt:
      (typeof cancelled.payment.cancelledAt === "string" ? cancelled.payment.cancelledAt : null) ??
      cancelled.created_at,
    status: refundStatus(cancelled.payment),
  };
}

/* --------------------------------------------------------------- 목록 조회 -- */

export function parsePageSize(raw: string | null): Parsed<number> {
  if (raw === null || raw === "") return { ok: true, value: DEFAULT_PAGE_SIZE };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_PAGE_SIZE) {
    return invalid(badRequest(`limit 은 1~${MAX_PAGE_SIZE} 사이여야 합니다.`, "invalid_limit"));
  }
  return { ok: true, value };
}

type ListResult = { ok: true; history: PaymentHistory } | { ok: false; error: unknown };

/**
 * 내 결제·취소 내역.
 *
 * **두 번 읽는다.** 결제 행을 먼저 페이지만큼 읽고, 그 `transction_key` 들의 취소 행을
 * 이어서 읽는다. 한 번에 읽으면 페이지 경계가 묶음 한가운데를 갈라서 "결제는 있는데
 * 취소가 안 보이는" 줄이 생긴다 — 원장은 행이 아니라 묶음 단위로 읽어야 한다.
 *
 * 남의 결제는 애초에 보이지 않는다. RLS 의 `payment is readable by its payer` 가
 * 게이트이고, BFF 는 그 위에 페이지 크기만 얹는다.
 *
 * 커서는 없다. 페이지를 넘기려면 `created_at + id` 키셋이어야 하는데(`payment.id` 는
 * uuid 라 단독으로는 정렬 기준이 못 된다), 그 커서를 필터로 되돌려 보내려면
 * 마이크로초 타임스탬프를 문자열로 왕복시켜야 한다. 한 사람의 신청 내역이 그만큼
 * 길어질 일이 없어서 지금은 상한(`?limit=`)만 두고 넘친 사실(`hasMore`)만 알린다.
 */
export async function listPaymentHistory(
  supabase: PaymentDb,
  limit: number,
  now = Date.now(),
): Promise<ListResult> {
  // 결제 행부터. +1 은 "더 있는지" 를 알기 위한 한 줄이다.
  const { data: paidRows, error: paidError } = await supabase
    .from("payment")
    .select(LEDGER_COLUMNS)
    .eq("type", PAYMENT_TYPE.paid)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (paidError) return { ok: false, error: paidError };

  const rows = (paidRows ?? []) as unknown as LedgerRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  if (page.length === 0) {
    return { ok: true, history: { orders: [], cancellations: [], hasMore } };
  }

  // 같은 묶음의 취소 행. 결제 건 하나에 취소 행은 최대 하나다
  // (유니크 `(transction_key, type)`).
  const keys = page.map((row) => row.transction_key);
  const { data: cancelRows, error: cancelError } = await supabase
    .from("payment")
    .select(LEDGER_COLUMNS)
    .eq("type", PAYMENT_TYPE.cancelled)
    .in("transction_key", keys);

  if (cancelError) return { ok: false, error: cancelError };

  const cancelByKey = new Map<string, LedgerRow>();
  for (const row of (cancelRows ?? []) as unknown as LedgerRow[]) {
    cancelByKey.set(row.transction_key, row);
  }

  const orders: OrderEntry[] = [];
  const cancellations: CancellationEntry[] = [];

  for (const row of page) {
    const snapshot = snapshotOf(row);
    if (!snapshot) {
      console.error("[bff:payment-history] 스냅샷 없는 결제 행", {
        paymentId: row.transction_key,
      });
      continue;
    }

    const cancelled = cancelByKey.get(row.transction_key);
    if (!cancelled) {
      orders.push(toOrderEntry(row, snapshot, now));
      continue;
    }

    const cancelSnapshot = snapshotOf(cancelled);
    cancellations.push(
      toCancellationEntry(
        { transction_key: row.transction_key, amount: row.amount, product: snapshot.product },
        {
          amount: cancelled.amount,
          created_at: cancelled.created_at,
          // 취소 스냅샷이 없으면(있을 수 없다) 결제 스냅샷으로라도 카드를 그린다.
          // 그때는 상태를 확정할 수 없으니 "환불 진행 중" 으로 떨어진다.
          payment: cancelSnapshot?.payment ?? snapshot.payment,
        },
      ),
    );
  }

  // 취소 내역은 취소한 순서로 본다. 결제 순서로 두면 방금 취소한 건이 아래에 묻힌다.
  cancellations.sort((a, b) => Date.parse(b.cancelledAt) - Date.parse(a.cancelledAt));

  return { ok: true, history: { orders, cancellations, hasMore } };
}
