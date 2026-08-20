"use client";

import PortOne, { type PaymentResponse } from "@portone/browser-sdk/v2";

/**
 * 포트원 V2 결제창을 부르는 자리. 화면은 이 파일 하나만 안다.
 *
 * 규칙의 원본은 `rules/payment.md` 이고, 서버 쪽 짝은 `src/lib/bff/payment.ts` 다.
 *
 * 여기서 하는 일은 결제창을 띄우고 **결제 건 ID 를 서버에 넘기는 것**까지다.
 * 성공 여부·금액은 여기서 판단하지 않는다 — 그 판단은 포트원 서버에 다시 물어보는
 * `/api/payments/complete` 만 한다.
 */

/**
 * 서버가 확정해 내려주는 결제 한 건.
 *
 * `lib/bff/payment.ts` 의 `PaymentReceipt` 와 같은 모양이다. 서버 모듈은 `server-only`
 * 이라 브라우저 번들로 가져올 수 없어서, `useProducts.ts` 가 상품 타입을 다시 적는 것과
 * 같은 방식으로 여기에 한 벌 더 둔다.
 *
 * 행사 일시는 ISO 문자열이다 — 한국 시간 표기는 `formatEventAt` 이 만든다.
 */
export type PaymentReceipt = {
  /** 주문 번호 = 포트원 paymentId = `payment.transction_key`. 셋은 같은 값이다. */
  orderNumber: string;
  productId: string;
  productName: string;
  eventAt: string;
  place: string;
  headcount: number;
  amount: number;
  method: string;
  thumbnail: string;
  paidAt: string;
};

/** 결제창에 넘기는 상점 정보. `/api/payments/config` 가 환경변수에서 읽어 내려준다. */
export type PaymentConfig = { storeId: string; channelKey: string };

/**
 * 결제 통화 · 결제 수단.
 *
 * 환경변수가 아니라 코드 상수다. 서버의 같은 값은 `lib/bff/payment.ts` 의
 * `CURRENCY` / `PAY_METHOD` 이고, 검증이 그 값으로 이뤄진다. 한쪽만 바꾸면 안 된다.
 */
const CURRENCY = "KRW" as const;
const PAY_METHOD = "CARD" as const;

/**
 * 결제창이 결과를 들고 돌아오는 주소. `src/app/payment/complete/page.tsx` 다.
 *
 * `https://` 또는 `http://` 로 시작하는 절대 주소여야 해서 실행 중인 origin 을 붙인다.
 * 환경변수로 박지 않는 이유이기도 하다 — 로컬·프리뷰·운영이 저마다 다른 도메인인데
 * 값을 하나 고정해 두면 프리뷰 배포에서 엉뚱한 곳으로 돌아온다.
 */
function redirectUrl(): string {
  return `${window.location.origin}/payment/complete`;
}

/**
 * 결제 건 ID. 포트원에 넘기는 값이자 우리 `payment.transction_key` 에 그대로 들어간다.
 *
 * 그래서 uuid 여야 한다(그 컬럼이 uuid 다). `crypto.randomUUID()` 는 보안 컨텍스트
 * (https 또는 localhost)에서만 있으므로, 휴대폰으로 `http://192.168.x.x` 에 붙어
 * 시험할 때를 대비해 `getRandomValues` 로도 만들 수 있게 해 둔다.
 */
export function newPaymentId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/**
 * 결제 설정. 아직 키를 안 넣었으면 `null` — 화면은 결제 버튼을 잠근다.
 *
 * 못 불러온 것과 설정이 없는 것을 갈라 봐야 사용자가 할 수 있는 일은 같아서
 * (기다렸다 다시 오기) 한 값으로 다룬다.
 */
export async function fetchPaymentConfig(): Promise<PaymentConfig | null> {
  try {
    const res = await fetch("/api/payments/config", { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as
      | { configured: false }
      | { configured: true; storeId: string; channelKey: string };
    return body.configured ? { storeId: body.storeId, channelKey: body.channelKey } : null;
  } catch {
    return null;
  }
}

/** 결제창에 실어 보내는 사용자 지정 데이터. 서버가 `parseCustomData` 로 되읽는다. */
export type PaymentCustomData = {
  productID: string;
  userID: string;
  /** 결제창은 총액만 알고 몇 명인지는 모른다. 영수증과 금액 검증에 둘 다 필요하다. */
  headcount: number;
};

/**
 * 결제창을 띄운다.
 *
 * 반환값이 `undefined` 면 **리다이렉트로 넘어갔다는 뜻**이다. `forceRedirect` 를 켜지
 * 않았으므로 PC 는 이 프라미스로 결과가 오고(그 편이 쓰던 화면을 잃지 않아 낫다),
 * 모바일은 `redirectUrl` 로 페이지가 통째로 떠난다. 두 갈래를 다 받아야 한다.
 */
export async function requestProductPayment(input: {
  config: PaymentConfig;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  customData: PaymentCustomData;
}): Promise<PaymentResponse | undefined> {
  return PortOne.requestPayment({
    storeId: input.config.storeId,
    channelKey: input.config.channelKey,
    paymentId: input.paymentId,
    orderName: input.orderName,
    totalAmount: input.totalAmount,
    currency: CURRENCY,
    payMethod: PAY_METHOD,
    redirectUrl: redirectUrl(),
    customData: input.customData,
  });
}

export type CompleteResult =
  | { ok: true; receipt: PaymentReceipt }
  | { ok: false; message: string };

const DEFAULT_ERROR = "결제 확인에 실패했어요. 마이 · 결제 내역에서 확인해 주세요.";

/**
 * 결제 완료 처리. 결제 건 ID 만 넘기면 서버가 포트원에 다시 물어 확정한다.
 *
 * 여러 번 불러도 안전하다(서버가 멱등하다). PC 의 반환값 갈래와 모바일의 리다이렉트
 * 갈래가 같은 이 함수로 모인다.
 */
export async function completePayment(paymentId: string): Promise<CompleteResult> {
  try {
    const res = await fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    const body = (await res.json().catch(() => null)) as
      | { receipt: PaymentReceipt }
      | { error?: { message?: string } }
      | null;

    if (!res.ok) {
      const message =
        body && "error" in body ? (body.error?.message ?? DEFAULT_ERROR) : DEFAULT_ERROR;
      return { ok: false, message };
    }
    if (!body || !("receipt" in body)) return { ok: false, message: DEFAULT_ERROR };

    return { ok: true, receipt: body.receipt };
  } catch {
    return { ok: false, message: DEFAULT_ERROR };
  }
}
