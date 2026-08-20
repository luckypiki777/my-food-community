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
import type { Receipt } from "./payments";
import { formatEventAt } from "./useProducts";

/**
 * 결제 화면이 쓰는 훅.
 *
 * 결제창을 부르는 일 자체는 `portone.ts` 가 한다. 여기는 그 위에 화면이 필요로 하는
 * 상태(설정을 불러왔는지 · 지금 결제 중인지)를 얹는다.
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

export { completePayment };
export type { PaymentReceipt };
