import "server-only";

import { badRequest, fail } from "@/lib/bff/response";

import {
  PAYMENT_TYPE,
  PORTONE_API_BASE,
  fetchPortonePayment,
  insertSnapshot,
  portoneConfig,
  signedAmount,
  type PaymentDb,
  type PortonePayment,
  type ProductSnapshot,
} from "./payment";
import { isCancellable, toCancellationEntry, type CancellationEntry } from "./paymentHistory";

/**
 * 결제 취소. **취소가 원장에 쌓이는 자리는 이 파일 하나뿐이다.**
 *
 * 규칙의 원본은 `rules/payment.md` 9-1 · 9-2 다.
 *
 * 들어오는 길이 둘이다 — 사용자가 마이 · 결제 내역에서 누르는 길
 * (`POST /api/payments/[paymentId]/cancel`)과 포트원 취소 웹훅
 * (`POST /api/payments/webhook`). 우리가 부른 취소도 웹훅으로 한 번 더 돌아오므로
 * **둘 다 `recordCancellation()` 한 곳으로 모인다.** 경로마다 기록을 따로 만들면
 * 같은 취소가 원장에 두 줄로 남는다.
 *
 * 원장은 insert-only 다. 기존 결제 행을 고치지 않고, 같은 `transction_key` 에
 * `type: 'CANCEL'` · **음수 금액**으로 한 행을 더 쌓는다. 그래서 그룹의 `sum(amount)`
 * 이 곧 남은 결제 금액이다.
 */

/* ------------------------------------------------------------------ 상수 -- */

/**
 * 포트원에 넘기는 취소 사유.
 *
 * 사용자가 문구를 적을 자리가 화면에 없다(취소 확인 모달에 확인 버튼 하나뿐이다).
 * 입력을 받게 되면 그 값을 실어 보내되, 길이 제한과 개행 처리를 여기서 정한다.
 */
export const CANCEL_REASON = "구매자 요청";

/** 원 결제 행 + 그 스냅샷. 취소 행의 구매자·상품이 여기서 온다. */
const PAID_COLUMNS =
  "transction_key, amount, product_id, user_id, created_at, payment_snapshot(snapshot_product, snapshot_payment)" as const;

/** 취소 행 + 그 스냅샷. 이미 취소된 건을 그대로 돌려줄 때 쓴다. */
const CANCEL_COLUMNS =
  "amount, created_at, payment_snapshot(snapshot_product, snapshot_payment)" as const;

type SnapshotPair = {
  snapshot_product: ProductSnapshot;
  snapshot_payment: PortonePayment;
} | null;

type PaidRow = {
  transction_key: string;
  amount: number | string;
  product_id: string;
  user_id: string;
  created_at: string;
  payment_snapshot: SnapshotPair;
};

type CancelRow = {
  amount: number | string;
  created_at: string;
  payment_snapshot: SnapshotPair;
};

/* ------------------------------------------------------------- 원장 읽기 -- */

async function loadPaidRow(supabase: PaymentDb, paymentId: string): Promise<PaidRow | null> {
  const { data, error } = await supabase
    .from("payment")
    .select(PAID_COLUMNS)
    .eq("transction_key", paymentId)
    .eq("type", PAYMENT_TYPE.paid)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PaidRow;
}

async function loadCancelRow(supabase: PaymentDb, paymentId: string): Promise<CancelRow | null> {
  const { data, error } = await supabase
    .from("payment")
    .select(CANCEL_COLUMNS)
    .eq("transction_key", paymentId)
    .eq("type", PAYMENT_TYPE.cancelled)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as CancelRow;
}

/** 원 결제 행 + 취소 행 → 화면이 쓰는 취소 내역 한 줄. */
function entryOf(paid: PaidRow, cancelled: CancelRow): CancellationEntry | null {
  const product = paid.payment_snapshot?.snapshot_product;
  if (!product) return null;

  return toCancellationEntry(
    { transction_key: paid.transction_key, amount: paid.amount, product },
    {
      amount: cancelled.amount,
      created_at: cancelled.created_at,
      payment:
        cancelled.payment_snapshot?.snapshot_payment ??
        paid.payment_snapshot?.snapshot_payment ??
        ({ status: "" } as PortonePayment),
    },
  );
}

/* --------------------------------------------------------- 포트원 취소 호출 -- */

type PortoneCancel =
  /** `already` 는 포트원 쪽에서는 이미 취소된 건이라는 뜻이다. 우리 원장만 밀렸다. */
  { ok: true; already: boolean } | { ok: false; response: Response };

/**
 * 포트원 결제 취소 요청.
 *
 * **전액 취소다.** `amount` 를 넣지 않으면 포트원이 남은 금액을 전부 취소한다 —
 * 부분 취소를 열려면 금액 계산 규칙부터 `rules/payment.md` 에 적는다(9-2).
 *
 * 시크릿은 서버에만 있다. 이 값 하나로 남의 결제까지 취소할 수 있으므로 브라우저로
 * 내려보내지 않는다 — 취소를 BFF 로 가져오는 이유가 이것이다.
 */
async function requestPortoneCancel(paymentId: string, reason: string): Promise<PortoneCancel> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) {
    console.error("[bff:payment-cancel] PORTONE_API_SECRET 이 없습니다.");
    return {
      ok: false,
      response: fail(503, "payment_not_configured", "결제가 아직 설정되지 않았습니다."),
    };
  }

  let res: Response;
  try {
    res = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `PortOne ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[bff:payment-cancel] 포트원 호출 실패", error);
    return {
      ok: false,
      response: fail(502, "cancel_unavailable", "결제 서버와 통신하지 못했습니다."),
    };
  }

  if (res.ok) return { ok: true, already: false };

  // 포트원 오류 본문은 `{ type, message }` 다. type 이 어떤 실패인지 말해 준다.
  const body = (await res.json().catch(() => null)) as { type?: string; message?: string } | null;
  const type = body?.type ?? "";

  if (res.status === 404 || type === "PAYMENT_NOT_FOUND") {
    return { ok: false, response: fail(404, "payment_not_found", "결제 건을 찾을 수 없습니다.") };
  }
  if (type === "PAYMENT_ALREADY_CANCELLED") {
    // 콘솔에서 먼저 환불했거나, 취소 웹훅이 우리보다 먼저 도착했다.
    // 취소 자체는 이미 이뤄졌으므로 원장 기록만 이어서 하면 된다.
    return { ok: true, already: true };
  }
  if (type === "PAYMENT_NOT_PAID") {
    return { ok: false, response: badRequest("결제가 완료되지 않았습니다.", "payment_failed") };
  }

  console.error("[bff:payment-cancel] 포트원 취소 실패", { paymentId, status: res.status, type });
  return { ok: false, response: fail(502, "cancel_unavailable", "결제를 취소하지 못했습니다.") };
}

/* ------------------------------------------------------------- 원장 기록 -- */

export type RecordCancellationResult =
  | { ok: true; kind: "recorded" | "already"; cancellation: CancellationEntry }
  /** 취소 요청은 들어왔는데 아직 취소 금액이 잡히지 않았다(비동기 취소). 기록할 게 없다. */
  | { ok: true; kind: "pending" }
  | { ok: false; response: Response };

/**
 * 취소를 원장에 쌓는다. **웹훅과 직접 취소가 같이 쓴다.**
 *
 * 순서가 곧 규칙이다:
 *   1. 원 결제 행을 읽는다. 취소 행의 `user_id`·`product_id` 는 **여기서** 온다 —
 *      `customData` 를 다시 믿지 않는다.
 *   2. 이미 취소 행이 있으면 그대로 돌려준다(멱등). 취소 웹훅의 재전송·중복은 흔하다.
 *   3. 금액은 웹훅 본문이 아니라 **포트원 결제 조회의 `amount.cancelled`** 에서 읽는다.
 *      그 값은 누적 취소액이라, 직전까지 쌓인 취소 합과의 **차액**만 넣어야
 *      `sum(amount)` 이 남은 금액과 맞는다.
 *   4. 스냅샷 → 취소 행 순으로 기록한다. 뒤가 실패하면 앞을 되돌린다.
 *
 * **부분 취소는 아직 열지 않았다.** 유니크 `(transction_key, type)` 가 한 결제 건에
 * 취소 행 하나만 허용하므로, 두 번째 부분 취소는 2번에서 이미 있는 행으로 돌아가고
 * 원장에는 반영되지 않는다 — 웹훅 라우트가 그 사실을 로그로 남긴다. 열 때는
 * `cancellationId` 컬럼을 더해 유니크를 다시 설계한다(`rules/payment.md` 9-1).
 */
export async function recordCancellation(
  supabase: PaymentDb,
  paymentId: string,
): Promise<RecordCancellationResult> {
  const paid = await loadPaidRow(supabase, paymentId);
  if (!paid) {
    // 결제가 아직 기록되지 않았다. 브라우저 완료 처리가 늦게 도착하는 중일 수 있으므로
    // 웹훅에는 재전송을 부탁한다(라우트가 5xx 를 재전송 신호로 번역한다).
    console.error("[bff:payment-cancel] 원 결제 행이 없다", { paymentId });
    return {
      ok: false,
      response: fail(503, "payment_not_recorded", "결제 기록을 찾지 못했습니다."),
    };
  }

  const existing = await loadCancelRow(supabase, paymentId);
  if (existing) {
    const entry = entryOf(paid, existing);
    if (!entry) {
      console.error("[bff:payment-cancel] 스냅샷 없는 결제 행", { paymentId });
      return { ok: false, response: fail(500, "internal_error", "결제 기록이 손상됐습니다.") };
    }
    return { ok: true, kind: "already", cancellation: entry };
  }

  const fetched = await fetchPortonePayment(paymentId);
  if (!fetched.ok) return { ok: false, response: fetched.response };
  const payment = fetched.payment;

  // 우리 상점의 결제 건이 맞는지. 시크릿이 같아도 상점이 다르면 우리 원장에 남길 이유가 없다.
  const config = portoneConfig();
  if (config && payment.storeId !== config.storeId) {
    console.warn("[bff:payment-cancel] 다른 상점의 결제 건", { paymentId });
    return { ok: false, response: fail(404, "payment_not_found", "결제 건을 찾을 수 없습니다.") };
  }

  // 누적 취소액. 여기까지 왔다는 건 우리 원장에 취소 행이 없다는 뜻이라 차액이 곧 전액이다.
  const cancelledTotal = Number(payment.amount?.cancelled ?? 0);
  if (!Number.isFinite(cancelledTotal) || cancelledTotal <= 0) {
    // 비동기 취소(`Transaction.CancelPending`)는 요청만 잡히고 금액이 아직 0 이다.
    // 확정되면 `Transaction.Cancelled` 가 한 번 더 온다. 그때 기록한다.
    console.info("[bff:payment-cancel] 아직 취소 금액이 없다", { paymentId });
    return { ok: true, kind: "pending" };
  }

  const product = paid.payment_snapshot?.snapshot_product;
  if (!product) {
    console.error("[bff:payment-cancel] 스냅샷 없는 결제 행", { paymentId });
    return { ok: false, response: fail(500, "internal_error", "결제 기록이 손상됐습니다.") };
  }

  // 취소 시점의 결제 조회 응답을 통째로 얼린다. 취소 영수증 URL·PG 취소번호처럼 나중에
  // 필요해지는 값이 전부 여기 들어 있다(`payment.cancellations`).
  const snapshotId = await insertSnapshot(supabase, payment, product);
  if (!snapshotId) {
    return { ok: false, response: fail(500, "internal_error", "취소 기록에 실패했습니다.") };
  }

  const { error: insertError } = await supabase.from("payment").insert({
    transction_key: paymentId,
    type: PAYMENT_TYPE.cancelled,
    // 취소는 음수로 쌓는다. 같은 transction_key 의 합이 곧 남은 결제 금액이다.
    amount: signedAmount(PAYMENT_TYPE.cancelled, cancelledTotal),
    // 구매자·상품은 원 결제 행에서 그대로 물려받는다.
    product_id: paid.product_id,
    user_id: paid.user_id,
    payment_snapshot_id: snapshotId,
  });

  if (insertError) {
    // 방금 넣은 스냅샷을 되돌린다. PostgREST 는 두 호출을 한 트랜잭션으로 묶어 주지 않는다.
    await supabase.from("payment_snapshot").delete().eq("id", snapshotId);

    // 우리 취소 요청과 취소 웹훅이 겹치면 여기로 온다. 유니크
    // `(transction_key, type)` 가 두 번째 행을 막아 주므로 오류가 아니라 멱등하게
    // 다시 조회해 돌려준다.
    if (insertError.code === "23505") {
      const raced = await loadCancelRow(supabase, paymentId);
      const entry = raced ? entryOf(paid, raced) : null;
      if (entry) return { ok: true, kind: "already", cancellation: entry };
      console.warn("[bff:payment-cancel] 이미 기록된 취소", { paymentId });
      return { ok: false, response: fail(409, "already_cancelled", "이미 취소된 결제입니다.") };
    }

    console.error("[bff:payment-cancel] 취소 기록 실패", { paymentId, error: insertError });
    return { ok: false, response: fail(500, "internal_error", "취소 기록에 실패했습니다.") };
  }

  const cancellation = toCancellationEntry(
    { transction_key: paymentId, amount: paid.amount, product },
    { amount: cancelledTotal, created_at: new Date().toISOString(), payment },
  );
  return { ok: true, kind: "recorded", cancellation };
}

/* ----------------------------------------------------- 사용자가 부르는 취소 -- */

export type CancelPaymentResult =
  | { ok: true; cancellation: CancellationEntry; alreadyCancelled: boolean }
  | { ok: false; response: Response };

/**
 * 결제 취소(구매자 요청).
 *
 * 권한 게이트는 **RLS 다.** 원 결제 행을 세션 클라이언트로 읽으므로, 남의 결제 건 ID 를
 * 넣으면 행이 안 보이고 그대로 404 로 끝난다. `viewerId` 를 따로 비교하지 않는 이유다.
 *
 * 취소 기한 판정은 `isCancellable()` 이 한다 — 화면 문구가 아니라 코드가 기준이다.
 * 화면도 같은 값으로 버튼을 감추지만(`OrderEntry.cancellable`), 최종 판정은 여기다.
 */
export async function cancelPayment(
  supabase: PaymentDb,
  paymentId: string,
): Promise<CancelPaymentResult> {
  const paid = await loadPaidRow(supabase, paymentId);
  if (!paid) {
    return { ok: false, response: fail(404, "not_found", "결제 건을 찾을 수 없습니다.") };
  }

  // 이미 취소한 건이면 포트원을 부를 것도 없다. 새로고침·중복 클릭에도 같은 답을 준다.
  const existing = await loadCancelRow(supabase, paymentId);
  if (existing) {
    const entry = entryOf(paid, existing);
    if (entry) return { ok: true, cancellation: entry, alreadyCancelled: true };
  }

  const product = paid.payment_snapshot?.snapshot_product;
  if (!product) {
    console.error("[bff:payment-cancel] 스냅샷 없는 결제 행", { paymentId });
    return { ok: false, response: fail(500, "internal_error", "결제 기록이 손상됐습니다.") };
  }

  if (!isCancellable(product.event_at)) {
    return {
      ok: false,
      response: badRequest("취소 기한이 지난 결제입니다.", "not_cancellable"),
    };
  }

  const cancelled = await requestPortoneCancel(paymentId, CANCEL_REASON);
  if (!cancelled.ok) return { ok: false, response: cancelled.response };

  // 취소 자체는 끝났다. 원장 기록은 웹훅과 **같은 함수**를 탄다 — 두 경로가 서로 다른
  // 행을 만들면 안 된다.
  const recorded = await recordCancellation(supabase, paymentId);
  if (!recorded.ok) return { ok: false, response: recorded.response };
  if (recorded.kind === "pending") {
    // 비동기 취소(가상계좌 등)라 아직 금액이 잡히지 않았다. 지금은 카드 한 갈래뿐이라
    // 여기 오지 않지만, 오면 "곧 확정된다" 는 뜻이므로 다시 확인하라고 알린다.
    // 확정은 `Transaction.Cancelled` 웹훅이 한다.
    return {
      ok: false,
      response: fail(409, "cancel_pending", "취소를 요청했어요. 잠시 후 다시 확인해 주세요."),
    };
  }

  return {
    ok: true,
    cancellation: recorded.cancellation,
    alreadyCancelled: cancelled.already || recorded.kind === "already",
  };
}
