"use client";

import { useCallback, useEffect, useState } from "react";

import {
  completePayment,
  fetchPaymentConfig,
  newPaymentId,
  requestProductPayment,
  type PaymentConfig,
  type PaymentReceipt,
} from "./portone";
import { formatDate, type Cancellation, type Order, type Receipt } from "./payments";
import { formatEventAt, type LoadStatus } from "./useProducts";

/**
 * 결제 화면이 쓰는 훅.
 *
 * 결제창을 부르는 일 자체는 `portone.ts` 가 한다. 여기는 그 위에 화면이 필요로 하는
 * 상태(설정을 불러왔는지 · 지금 결제 중인지)와, 마이 화면이 읽는 결제·취소 내역을 얹는다.
 *
 * CLAUDE.md 규약대로 브라우저는 Supabase 도 포트원 REST API 도 직접 부르지 않는다.
 * 내역 조회도 결제 취소도 `/api/payments/*` 를 통한다.
 */

/** 결제 설정 상태. `unavailable` 은 키를 안 넣었거나 못 불러온 것 둘 다다. */
export type PaymentConfigStatus = "loading" | "ready" | "unavailable";

export function usePaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [status, setStatus] = useState<PaymentConfigStatus>("loading");

  useEffect(() => {
    // 언마운트 후 setState 를 막는다. StrictMode 이중 실행에서도 안전하다.
    let cancelled = false;

    void (async () => {
      const next = await fetchPaymentConfig();
      if (cancelled) return;
      setConfig(next);
      setStatus(next ? "ready" : "unavailable");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, status };
}

/**
 * 결제 요청의 결말.
 *
 * `redirected` 는 모바일 갈래다 — 페이지가 `redirectUrl` 로 떠나는 중이라 이 화면이
 * 더 할 일이 없다. 결과는 돌아온 뒤 `FoodApp` 이 받는다.
 */
export type PayOutcome =
  | { status: "paid"; receipt: PaymentReceipt }
  | { status: "redirected" }
  | { status: "failed"; message: string };

export type PayInput = {
  productId: string;
  userId: string;
  orderName: string;
  headcount: number;
  totalAmount: number;
};

/**
 * 결제창을 띄우고 결과를 확정한다.
 *
 * 결제창이 닫힌 뒤 곧바로 `/api/payments/complete` 를 부르는 게 핵심이다. 결제창의
 * 반환값에는 "결제됨" 이라는 말만 있고 금액을 보증하는 건 아무것도 없다 — 확정은
 * 포트원 서버에 다시 물어보는 서버만 한다.
 */
export function usePayment() {
  const { config, status } = usePaymentConfig();
  const [pending, setPending] = useState(false);

  const pay = useCallback(
    async (input: PayInput): Promise<PayOutcome> => {
      if (!config) {
        return { status: "failed", message: "결제가 아직 설정되지 않았어요." };
      }

      setPending(true);
      try {
        const response = await requestProductPayment({
          config,
          paymentId: newPaymentId(),
          orderName: input.orderName,
          totalAmount: input.totalAmount,
          customData: {
            productID: input.productId,
            userID: input.userId,
            headcount: input.headcount,
          },
        });

        // 반환값이 없으면 리다이렉트 갈래다. 페이지가 떠나는 중이라 여기서 끝낸다.
        if (!response) return { status: "redirected" };

        if (response.code !== undefined) {
          return { status: "failed", message: response.message ?? "결제가 완료되지 않았어요." };
        }

        const completed = await completePayment(response.paymentId);
        if (!completed.ok) return { status: "failed", message: completed.message };

        return { status: "paid", receipt: completed.receipt };
      } catch (error) {
        // 결제창이 뜨기 전에 나는 오류(파라미터 형식 · 네트워크)는 여기로 온다.
        console.error("[payment] 결제 요청 실패", error);
        return { status: "failed", message: "결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요." };
      } finally {
        setPending(false);
      }
    },
    [config],
  );

  return { config, status, pending, pay };
}

/**
 * 서버가 확정한 결제 → 화면이 쓰는 영수증.
 *
 * 서버는 행사 일시를 ISO 로 준다. 한국 시간 표기를 만드는 규칙은 `formatEventAt` 한 곳에만
 * 두려는 것이다 — 서버가 문구까지 만들면 같은 규칙이 두 벌이 된다.
 */
export function receiptFrom(paid: PaymentReceipt): Receipt {
  return {
    orderNumber: paid.orderNumber,
    productName: paid.productName,
    when: formatEventAt(paid.eventAt),
    place: paid.place,
    headcount: paid.headcount,
    amount: paid.amount,
    method: paid.method,
    thumbnail: paid.thumbnail,
  };
}

/* ------------------------------------------------- 결제 · 취소 내역 (마이) -- */

/**
 * 서버가 내려주는 결제 한 건. `lib/bff/paymentHistory.ts` 의 `OrderEntry` 와 같은 모양이다.
 *
 * 서버 모듈은 `server-only` 이라 브라우저 번들로 가져올 수 없어서, `useProducts.ts` 가
 * 상품 타입을 다시 적는 것과 같은 방식으로 여기에 한 벌 더 둔다.
 */
type OrderEntry = {
  orderNumber: string;
  productId: string;
  productName: string;
  /** ISO 문자열. 한국 시간 표기는 아래에서 `formatEventAt` 이 만든다. */
  eventAt: string;
  headcount: number;
  amount: number;
  method: string;
  thumbnail: string;
  paidAt: string;
  cancellable: boolean;
};

/** 서버가 내려주는 취소 한 건. `CancellationEntry` 와 같은 모양이다. */
type CancellationEntry = {
  orderNumber: string;
  productId: string;
  productName: string;
  eventAt: string;
  headcount: number;
  thumbnail: string;
  paidAmount: number;
  refundAmount: number;
  cancelledAt: string;
  status: "refunding" | "refunded";
};

type HistoryBody = {
  orders: OrderEntry[];
  cancellations: CancellationEntry[];
  hasMore: boolean;
};

/**
 * 환불이 어떻게 흘러가는지 알려 주는 한 줄.
 *
 * 포트원이 취소를 확정해도(`refunded`) 카드 대금이 실제로 돌아오는 건 카드사 몫이다.
 * "취소 완료" 만 보여주면 통장에 돈이 안 들어왔다는 문의가 그 자리에서 생긴다.
 */
const REFUND_NOTE: Record<CancellationEntry["status"], string> = {
  refunding: "환불을 처리하고 있어요",
  refunded: "카드사에 따라 3~5영업일이 걸릴 수 있어요",
};

/**
 * 결제 한 건 → 결제 내역 카드.
 *
 * "이용 완료" 는 컬럼이 아니라 **행사가 지났는지**로 정한다. 서버가 미리 정해 주면
 * 응답을 받아 둔 채 자정을 넘겼을 때 카드가 계속 "결제 완료" 로 남는다.
 */
function toOrder(entry: OrderEntry, now: number): Order {
  const started = Date.parse(entry.eventAt) <= now;
  return {
    id: entry.orderNumber,
    productName: entry.productName,
    thumbnail: entry.thumbnail,
    status: started ? "used" : "paid",
    when: formatEventAt(entry.eventAt),
    headcount: entry.headcount,
    amount: entry.amount,
    paidAt: formatDate(entry.paidAt),
    cancellable: entry.cancellable,
  };
}

function toCancellation(entry: CancellationEntry): Cancellation {
  return {
    id: entry.orderNumber,
    productName: entry.productName,
    thumbnail: entry.thumbnail,
    status: entry.status,
    when: formatEventAt(entry.eventAt),
    headcount: entry.headcount,
    cancelledAt: formatDate(entry.cancelledAt),
    paidAmount: entry.paidAmount,
    refundAmount: entry.refundAmount,
    note: REFUND_NOTE[entry.status],
  };
}

/**
 * 마이 화면의 결제 내역 · 취소 내역.
 *
 * **한 요청으로 둘 다 받는다.** 두 탭은 같은 원장에서 오고, 한 건이 취소되면 결제
 * 내역에서 빠져 취소 내역으로 옮겨간다 — 따로 부르면 그 사이에 취소가 끼어들 때 같은
 * 건이 양쪽에 다 보이거나 양쪽에서 다 사라진다.
 *
 * `enabled` 는 로그인 여부다. 로그아웃하면 목록을 비운다 — 안 지우면 다음 사람이 남의
 * 내역을 본다(예전에 화면 상태로 들고 있을 때 로그아웃 처리로 하던 일이다).
 */
export function usePaymentHistory(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("loading");
  // 값이 바뀌면 아래 effect 가 다시 돈다. 결제·취소 직후 목록을 새로 읽는 손잡이다.
  const [reloadKey, setReloadKey] = useState(0);
  const [lastEnabled, setLastEnabled] = useState(enabled);

  // 로그인/로그아웃 경계에서 값을 비운다. 안 지우면 로그아웃 직후 다음 사용자에게
  // 이전 사용자의 결제 내역이 한 프레임 보인다.
  // effect 가 아니라 렌더 중에 맞추는 이유: effect 로 하면 잘못된 값이 이미 한 번 그려진
  // 뒤다(`usePlaceList` 와 같은 규약).
  if (lastEnabled !== enabled) {
    setLastEnabled(enabled);
    setOrders([]);
    setCancellations([]);
    setHasMore(false);
    setStatus("loading");
  }

  useEffect(() => {
    if (!enabled) return;

    // 언마운트 후 setState 를 막는다. StrictMode 이중 실행에서도 안전하다.
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/payments", { cache: "no-store" });
        if (!res.ok) throw new Error(`payments responded ${res.status}`);
        const body = (await res.json()) as HistoryBody;
        if (cancelled) return;

        // "이용 완료" 판정에 쓰는 시각은 한 번만 읽는다. 카드마다 다시 읽으면 목록
        // 한가운데서 기준이 바뀔 수 있다.
        const now = Date.now();
        setOrders(body.orders.map((entry) => toOrder(entry, now)));
        setCancellations(body.cancellations.map(toCancellation));
        setHasMore(body.hasMore);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey]);

  /** 결제·취소가 끝난 뒤 원장을 다시 읽는다. 두 탭이 한 번에 최신이 된다. */
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { orders, cancellations, hasMore, status, reload };
}

/* --------------------------------------------------------------- 결제 취소 -- */

export type CancelResult = { ok: true } | { ok: false; message: string };

const CANCEL_ERROR = "결제를 취소하지 못했어요. 잠시 후 다시 시도해 주세요.";

/**
 * 결제 취소. 주문 번호(= 포트원 paymentId)만 넘기면 서버가 포트원에 취소를 요청하고
 * 원장에 취소 행을 쌓는다.
 *
 * 브라우저는 포트원 취소 API 를 부르지 않는다 — 그 호출에 필요한 시크릿 하나면 남의
 * 결제까지 취소할 수 있다. 다른 API 와 같은 규약대로 BFF 가 대신 부른다.
 *
 * 여러 번 불러도 안전하다(서버가 멱등하다). 성공하면 목록을 다시 읽어야 하므로
 * 취소된 건을 여기서 돌려주지 않는다 — 화면은 `usePaymentHistory().reload()` 한 번으로
 * 두 탭을 한꺼번에 맞춘다.
 */
export async function cancelPayment(paymentId: string): Promise<CancelResult> {
  try {
    const res = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
    });
    if (res.ok) return { ok: true };

    const body = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    return { ok: false, message: body?.error?.message ?? CANCEL_ERROR };
  } catch {
    return { ok: false, message: "네트워크 문제로 결제를 취소하지 못했어요." };
  }
}

export { completePayment };
export type { PaymentReceipt };
