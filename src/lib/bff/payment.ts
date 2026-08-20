import "server-only";

import { randomUUID } from "node:crypto";

import { badRequest, fail, invalid, type Parsed } from "@/lib/bff/response";
import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseAdminClient, SupabaseServerClient } from "@/lib/supabase/server";
import { productImageUrl } from "@/lib/supabase/storage";

import { PUBLIC_STATUS } from "./product";

/**
 * 강연·모임 결제(포트원 V2)가 쓰는 검증 · 조회 · 기록.
 *
 * 규칙의 원본은 `rules/payment.md` 다. 여기 코드와 그 문서가 어긋나면 문서가 맞다 —
 * 값을 바꿀 때는 둘 다 고친다.
 *
 * 이 파일이 하는 일은 하나다: **브라우저가 결제창에서 들고 온 결과를 믿지 않는 것.**
 * 금액·상품·구매자는 전부 포트원 서버와 우리 DB 에서 다시 읽어 맞춰 본다.
 */

/* ------------------------------------------------------------------ 상수 -- */

/** 결제창에 넘기는 결제 수단. 지금은 카드 하나뿐이다. */
export const PAY_METHOD = "CARD";

/** 결제 통화. `product.price` 가 원화라 고정값이다. */
export const CURRENCY = "KRW";

/**
 * 한 번에 신청할 수 있는 최대 인원.
 *
 * 화면 쪽 같은 값은 `src/components/food/payments.ts` 의 `MAX_PER_ORDER` 다.
 * 맛집 등록(`place.ts` ↔ `RegisterScreen`)과 같은 규약으로, 화면은 왕복을 아끼려고
 * 미리 걸러 보고 **최종 판정은 여기서** 한다. 한쪽만 바꾸면 안 된다.
 */
export const MAX_PER_ORDER = 4;

/**
 * `payment.type` — 원장의 행 종류.
 *
 * `payment` 에는 상태 컬럼이 없다. 결제도 취소도 각각 한 행으로 쌓고, 지금 상태는
 * 같은 `transction_key` 를 가진 행들을 모아서 읽는다. 그래서 기록을 고치는 일이 없고
 * RLS 에도 update/delete 정책을 두지 않았다.
 */
export const PAYMENT_TYPE = {
  /** 결제 완료. `amount` 는 **양수**. */
  paid: "PAYMENT",
  /** 결제 취소(환불). `amount` 는 **음수**. 쌓는 자리는 `paymentCancel.ts` 다. */
  cancelled: "CANCEL",
} as const;

export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

/**
 * 원장에 넣을 부호 있는 금액. 결제는 `+`, 취소는 `-` 다.
 *
 * 이렇게 넣어야 같은 `transction_key` 를 `sum()` 한 값이 곧 "지금 남은 결제 금액" 이
 * 된다 — 상태 컬럼 없이 행만 쌓는 원장이 성립하는 이유다.
 * DB 도 같은 규칙이다(`payment_amount_sign` 체크 제약). 한쪽만 바꾸면 안 된다.
 */
export function signedAmount(type: PaymentType, amount: number): number {
  const magnitude = Math.abs(amount);
  return type === PAYMENT_TYPE.cancelled ? -magnitude : magnitude;
}

/** 포트원 REST API. 결제 단건 조회(여기)와 결제 취소(`paymentCancel.ts`)가 쓴다. */
export const PORTONE_API_BASE = "https://api.portone.io";

/* ------------------------------------------------------- 환경변수 · 설정 -- */

/** 브라우저가 결제창을 띄우려면 이 둘이 필요하다. */
export type PortoneConfig = { storeId: string; channelKey: string };

/**
 * 결제창 설정. 하나라도 없으면 `null`.
 *
 * `requireEnv()` 를 쓰지 않는 건 일부러다. 지도 키(`/api/map/config`)와 같은 판단으로,
 * 결제를 못 붙였다고 앱 전체가 죽을 이유는 없다.
 */
export function portoneConfig(): PortoneConfig | null {
  const storeId = process.env.PORTONE_STORE_ID;
  const channelKey = process.env.PORTONE_CHANNEL_KEY;
  if (!storeId || !channelKey) return null;
  return { storeId, channelKey };
}

/**
 * **결제를 시작해도 되는가.** 결제창 값 둘에 더해 `PORTONE_API_SECRET` 까지 본다.
 *
 * 시크릿은 결제창을 여는 데는 쓰이지 않는다 — 카드 승인은 브라우저 ↔ 포트원 ↔ PG
 * 사이에서 우리 서버를 거치지 않고 끝난다. 그래서 시크릿 없이도 결제창은 멀쩡히 뜨고
 * **승인까지 난다.** 그러고 나서 완료 처리만 503 으로 막힌다 — 돈은 나갔는데 우리
 * DB 엔 아무것도 없는, 가능한 상태 중 가장 나쁜 자리다.
 *
 * 그 자리에 사용자를 데려다 놓지 않으려고 여기서 미리 끊는다. 시작할 수 없다는 걸
 * 시작하기 전에 아는 게 낫다.
 */
export function canStartPayment(): boolean {
  return portoneConfig() !== null && Boolean(process.env.PORTONE_API_SECRET);
}

/**
 * 웹훅 서명 검증에 쓰는 시크릿. `PORTONE_API_SECRET` 과 **다른 값**이다.
 *
 * 없으면 웹훅을 검증할 방법이 없다. 검증 없이 본문을 믿으면 아무나 결제 완료를 만들 수
 * 있으므로, 그때는 웹훅을 받지 않고 503 으로 끊는다(`canStartPayment` 와 달리 결제
 * 시작을 막지는 않는다 — 웹훅은 안전망이지 결제의 전제가 아니다).
 */
export function portoneWebhookSecret(): string | null {
  return process.env.PORTONE_WEBHOOK_SECRET ?? null;
}

/* --------------------------------------------------------------- 검증 도구 -- */

/** uuid v1~v5 공통 형태. `product.ts` 와 같은 값이다. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 포트원에 넘긴 결제 건 ID.
 *
 * 우리는 이 값으로 uuid 를 쓰고, 그대로 `payment.transction_key`(uuid 컬럼)에 넣는다.
 * 그래서 형태가 uuid 가 아니면 DB 까지 갈 것도 없이 여기서 끊는다 — 그냥 넘기면
 * PostgREST 가 `22P02` 로 돌려주는데, 이 코드는 `fromSupabaseError` 의 표에 없어서
 * 400 이어야 할 요청이 500 으로 떨어진다.
 */
export function parsePaymentId(raw: unknown): Parsed<string> {
  if (typeof raw !== "string" || !UUID_PATTERN.test(raw)) {
    return invalid(badRequest("결제 건 ID 가 올바르지 않습니다.", "invalid_payment_id"));
  }
  return { ok: true, value: raw };
}

/* ------------------------------------------------------- 포트원 결제 조회 -- */

/**
 * 포트원 결제 단건. 우리가 실제로 보는 필드만 적는다.
 *
 * 전체 스키마는 포트원 OpenAPI 의 `PaidPayment` 다. 스냅샷에는 응답 전체를 그대로
 * 넣으므로, 여기 없는 필드가 필요해지면 DB 에서 꺼내 쓸 수 있다.
 */
/** 결제에 쓰인 카드. 카드 결제는 `method.card`, 간편결제는 `method.easyPayMethod.card` 다. */
type PortoneCard = { name?: string; number?: string; issuer?: string; brand?: string };

export type PortonePayment = {
  status: string;
  id: string;
  storeId: string;
  orderName: string;
  currency: string;
  amount: { total: number; paid?: number; cancelled?: number };
  /** 결제창에 넘긴 `customData`. **문자열로** 돌아온다. */
  customData?: string;
  channel?: { type?: string; name?: string; pgProvider?: string };
  method?: {
    type?: string;
    card?: PortoneCard;
    /** 간편결제 제공자(`TOSSPAY` 등). `type` 이 `PaymentMethodEasyPay` 일 때만 있다. */
    provider?: string;
    /** **간편결제는 카드가 여기 한 겹 안에 있다.** 아래 `formatPayMethod` 참고. */
    easyPayMethod?: { type?: string; card?: PortoneCard };
  };
  paidAt?: string;
  receiptUrl?: string;
  pgTxId?: string;
  [key: string]: unknown;
};

type PortoneFetch =
  | { ok: true; payment: PortonePayment }
  | { ok: false; response: Response };

/**
 * 포트원 결제 단건 조회.
 *
 * 시크릿은 서버에만 있다. 브라우저는 이 API 를 부를 수 없고, 불러서도 안 된다 —
 * 결제 성공 여부를 브라우저 말만 듣고 믿으면 금액 위변조를 막을 방법이 없다.
 */
export async function fetchPortonePayment(paymentId: string): Promise<PortoneFetch> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) {
    console.error("[bff:payment] PORTONE_API_SECRET 이 없습니다.");
    return {
      ok: false,
      response: fail(503, "payment_not_configured", "결제가 아직 설정되지 않았습니다."),
    };
  }

  let res: Response;
  try {
    res = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${secret}` },
      cache: "no-store",
    });
  } catch (error) {
    console.error("[bff:payment] 포트원 호출 실패", error);
    return {
      ok: false,
      response: fail(502, "payment_unavailable", "결제 서버와 통신하지 못했습니다."),
    };
  }

  if (res.status === 404) {
    return { ok: false, response: fail(404, "payment_not_found", "결제 건을 찾을 수 없습니다.") };
  }
  if (!res.ok) {
    console.error("[bff:payment] 포트원 오류", res.status, await res.text().catch(() => ""));
    return {
      ok: false,
      response: fail(502, "payment_unavailable", "결제 정보를 확인하지 못했습니다."),
    };
  }

  return { ok: true, payment: (await res.json()) as PortonePayment };
}

/* ------------------------------------------------------------- customData -- */

/**
 * 결제창에 실어 보낸 `customData`.
 *
 * 이건 **브라우저가 준 값이다.** 신원 확인용이 아니라 "무엇을 사려 했는지" 를 되짚는
 * 실마리로만 쓴다. 실제 판정은 여기 적힌 상품을 DB 에서 다시 읽어서 한다.
 */
export type PaymentCustomData = {
  productID: string;
  userID: string;
  headcount: number;
};

export function parseCustomData(raw: string | undefined): Parsed<PaymentCustomData> {
  const reject = () =>
    invalid(badRequest("결제 정보를 확인하지 못했습니다.", "invalid_custom_data"));

  if (!raw) return reject();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return reject();
  }
  if (typeof parsed !== "object" || parsed === null) return reject();

  const { productID, userID, headcount } = parsed as Record<string, unknown>;
  if (typeof productID !== "string" || !UUID_PATTERN.test(productID)) return reject();
  if (typeof userID !== "string" || !UUID_PATTERN.test(userID)) return reject();
  if (!Number.isSafeInteger(headcount) || (headcount as number) < 1) return reject();

  return { ok: true, value: { productID, userID, headcount: headcount as number } };
}

/* ------------------------------------------------------------------ 영수증 -- */

/**
 * 결제 완료 화면과 결제 내역이 쓰는 한 건.
 *
 * 행사 일시는 ISO 문자열 그대로 준다 — 한국 시간 표기는 화면(`formatEventAt`)이 만든다.
 * 서버가 문구를 만들면 같은 규칙이 두 벌이 된다.
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
  /** "신용카드 (BC카드 1234)" 처럼 사람이 읽는 한 줄. */
  method: string;
  /** 내역 카드의 썸네일. 스냅샷에 담긴 경로를 공개 URL 로 조립한 값. */
  thumbnail: string;
  /** 결제 시각 ISO. */
  paidAt: string;
};

/**
 * `snapshot_product` 에 담기는 상품. 결제 시점의 값을 **통째로 얼려 둔다.**
 *
 * 영수증을 `product` 테이블에서 다시 읽지 않는 이유다 — 운영자가 가격을 고치거나
 * 상품을 내리면(`status`) 지난 영수증의 내용까지 같이 바뀌어 버린다.
 */
export type ProductSnapshot = {
  id: string;
  name: string;
  event_at: string;
  address: string;
  price: number;
  capacity: number;
  image_path_main_md: string;
  /** 결제 시점에 고른 인원. `product` 에는 없는 값이라 여기 같이 얼린다. */
  headcount: number;
};

/**
 * 결제 수단 한 줄. 카드가 아니거나 정보가 없으면 있는 만큼만 쓴다.
 *
 * **간편결제는 카드가 한 겹 안에 들어 있다.** 결제창에 `payMethod: "CARD"` 를 넘겨도
 * 사용자가 결제창에서 토스페이 같은 간편결제를 고르면 응답이
 * `method.type: "PaymentMethodEasyPay"` 로 오고, 카드는 `method.card` 가 아니라
 * `method.easyPayMethod.card` 에 실린다. 위만 보면 실제로 카드로 냈는데도 영수증에
 * "카드" 라고만 찍힌다(2026-08-19 테스트 결제에서 실제로 그랬다).
 */
export function formatPayMethod(payment: PortonePayment): string {
  const card = payment.method?.card ?? payment.method?.easyPayMethod?.card;
  if (!card) return "카드";
  const name = card.name ?? "카드";
  const tail = maskedTail(card.number);
  return tail ? `${name} ${tail}` : name;
}

/**
 * 마스킹된 카드 번호에서 보여줄 뒷자리.
 *
 * 전부 이어 붙여서 뒤 4자리를 자르면 안 된다 — `"37997170****69*"` 는 숫자만 남기면
 * `"3799717069"` 가 되어 앞 BIN 번호 두 자리가 "뒷자리" 로 섞여 들어간다. 마스크
 * **뒤쪽 숫자 덩어리**만 쓴다. 가려진 자리는 우리도 모르므로 아는 만큼만 보여준다.
 */
function maskedTail(number: string | undefined): string {
  const groups = number?.match(/\d+/g);
  if (!groups || groups.length < 2) return "";
  const tail = groups[groups.length - 1];
  return tail.length >= 2 && tail.length <= 4 ? tail : "";
}

function toReceipt(
  orderNumber: string,
  product: ProductSnapshot,
  payment: PortonePayment,
  amount: number,
): PaymentReceipt {
  return {
    orderNumber,
    productId: product.id,
    productName: product.name,
    eventAt: product.event_at,
    place: product.address,
    headcount: product.headcount,
    amount,
    method: formatPayMethod(payment),
    thumbnail: productImageUrl(product.image_path_main_md),
    paidAt: payment.paidAt ?? new Date().toISOString(),
  };
}

/* --------------------------------------------------------- 결제 완료 처리 -- */

/** 결제 완료 처리에 필요한 상품 컬럼. 스냅샷에 얼릴 값과 같다. */
const PRODUCT_COLUMNS_FOR_PAYMENT =
  "id, name, event_at, address, price, capacity, image_path_main_md" as const;

type CompleteResult =
  | { ok: true; receipt: PaymentReceipt; alreadyRecorded: boolean }
  | { ok: false; response: Response };

/**
 * 완료 처리를 부르는 클라이언트.
 *
 * 브라우저 경로는 세션 클라이언트(RLS 가 걸린다), 웹훅 경로는 admin 클라이언트다
 * (RLS 를 우회한다). 쿼리 모양은 같으므로 한 함수가 둘 다 받는다.
 */
export type PaymentDb = SupabaseServerClient | SupabaseAdminClient;

/* ------------------------------------------------------------ 스냅샷 기록 -- */

/**
 * 결제 시점을 얼려 넣고 그 id 를 돌려준다. **id 는 우리가 만들어서 넣는다.**
 *
 * `.insert().select("id")` 로 돌려받으면 안 된다. RETURNING 은 `payment_snapshot` 의
 * SELECT 정책("이 스냅샷을 가리키는 `payment` 행이 내 것일 때")을 지나야 하는데, 삽입
 * 시점에는 그 결제 행이 아직 없다 — 없어야 정상이다(`payment.payment_snapshot_id` 가
 * NOT NULL 이라 스냅샷이 먼저다). 그래서 세션 클라이언트는 방금 넣은 자기 스냅샷을
 * 스스로 읽지 못하고 `42501` 로 떨어진다. 웹훅의 admin 클라이언트만 RLS 를 우회해
 * 통과하므로, 브라우저 경로에서만 나는 오류였다.
 *
 * id 를 먼저 정해 두면 돌려받을 것이 없다.
 */
export async function insertSnapshot(
  supabase: PaymentDb,
  snapshotPayment: PortonePayment,
  snapshotProduct: ProductSnapshot,
): Promise<string | null> {
  const id = randomUUID();
  const { error } = await supabase.from("payment_snapshot").insert({
    id,
    // 두 값 모두 jsonb 컬럼이다. 우리 타입에는 인덱스 시그니처가 있어 Json 과
    // 구조적으로 맞아떨어지지 않으므로 한 번 못박아 넣는다.
    snapshot_payment: snapshotPayment as unknown as Json,
    snapshot_product: snapshotProduct as unknown as Json,
  });

  if (error) {
    console.error("[bff:payment] 스냅샷 기록 실패", { paymentId: snapshotPayment.id, error });
    return null;
  }
  return id;
}

/**
 * **구매자를 무엇으로 정하는가.** 완료 처리로 들어오는 길이 둘이라 여기서 갈린다.
 *
 * 판정 표(`rules/payment.md` 7절) 8번 — "customData.userID 가 구매자인가" — 만 다르고
 * 나머지 검사는 두 경로가 글자 그대로 같은 코드를 지난다. 검증을 두 벌로 만들지 않는
 * 이유다: 규칙이 갈라지면 한쪽만 고치는 사고가 난다.
 */
export type PaymentActor =
  /**
   * 브라우저에서 온 요청(`POST /api/payments/complete`).
   * `customData.userID` 가 **지금 로그인한 사람과 같아야** 한다. 이 검사가 없으면
   * 남의 결제 건 ID 로 자기 결제 내역을 만들 수 있다.
   */
  | { kind: "session"; viewerId: string }
  /**
   * 포트원 웹훅. 로그인한 사람이 없으므로 `customData.userID` 를 그대로 구매자로 쓰되,
   * **실재하는 사용자인지** 확인한다(`userExists`). 요청의 진위는 그 앞에서 서명 검증이
   * 보장한다.
   */
  | { kind: "webhook"; userExists: (userId: string) => Promise<boolean> };

/** 웹훅 경로의 액터. 사용자 존재 확인에 admin 클라이언트가 필요하다. */
export function webhookActor(admin: SupabaseAdminClient): PaymentActor {
  return {
    kind: "webhook",
    userExists: async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) {
        console.error("[bff:payment] 사용자 확인 실패", { userId, error });
        return false;
      }
      return Boolean(data?.user);
    },
  };
}

/**
 * 이미 기록한 결제인지 본다. 맞으면 스냅샷에서 영수증을 되살린다.
 *
 * 완료 처리는 **두 경로로 들어온다** — PC 는 `requestPayment()` 반환값을 받고,
 * 모바일은 `redirectUrl` 로 돌아와서 부른다. 사용자가 새로고침해도 다시 온다.
 * 그래서 이 함수는 몇 번을 불러도 같은 답을 줘야 한다.
 *
 * RLS 가 `user_id = auth.uid()` 로 걸려 있으므로, 남의 결제 건 ID 를 넣어도 여기서는
 * 안 보인다(그다음 insert 가 unique 위반으로 막힌다).
 */
async function findRecorded(
  supabase: PaymentDb,
  paymentId: string,
): Promise<PaymentReceipt | null> {
  const { data, error } = await supabase
    .from("payment")
    .select("amount, transction_key, payment_snapshot(snapshot_product, snapshot_payment)")
    .eq("transction_key", paymentId)
    .eq("type", PAYMENT_TYPE.paid)
    .maybeSingle();

  if (error || !data) return null;

  const snapshot = data.payment_snapshot as unknown as
    | { snapshot_product: ProductSnapshot; snapshot_payment: PortonePayment }
    | null;
  if (!snapshot) return null;

  // 원장에는 부호가 붙어 있다(결제 +, 취소 -). 영수증에 찍히는 금액은 낸 돈이므로
  // 부호를 떼고 쓴다.
  return toReceipt(
    paymentId,
    snapshot.snapshot_product,
    snapshot.snapshot_payment,
    Math.abs(Number(data.amount)),
  );
}

/**
 * 결제 완료 처리. **결제가 확정되는 자리는 여기 하나뿐이다.**
 *
 * 들어오는 길은 셋이다 — PC 결제창 반환값 · 모바일 리다이렉트 · 포트원 웹훅. 셋 다
 * 이 함수로 모이고, 갈리는 건 구매자를 정하는 방식(`actor`) 하나뿐이다.
 *
 * 순서가 곧 규칙이다:
 *   1. 이미 기록한 건이면 그대로 돌려준다(멱등 · **중복 결제 1차 차단**).
 *   2. 포트원에서 결제 건을 **다시 읽는다.** 밖에서 받은 건 결제 건 ID 하나뿐이다.
 *   3. 상점·통화·상태를 본다.
 *   4. `customData` 의 구매자를 확정한다(`actor` 에 따라 갈린다).
 *   5. 상품을 **DB 에서** 읽어 금액(`price × headcount`)과 주문명을 맞춰 본다.
 *   6. 스냅샷 → 결제 행 순으로 기록한다. 뒤가 실패하면 앞을 되돌린다.
 *      유니크 위반(**중복 결제 2차 차단**)은 오류가 아니라 멱등하게 다시 조회한다.
 */
export async function completePayment(
  supabase: PaymentDb,
  actor: PaymentActor,
  paymentId: string,
): Promise<CompleteResult> {
  const recorded = await findRecorded(supabase, paymentId);
  if (recorded) return { ok: true, receipt: recorded, alreadyRecorded: true };

  const fetched = await fetchPortonePayment(paymentId);
  if (!fetched.ok) return { ok: false, response: fetched.response };
  const payment = fetched.payment;

  // 우리 상점의 결제 건이 맞는지. 다른 상점 것이면 볼 이유가 없다.
  const config = portoneConfig();
  if (config && payment.storeId !== config.storeId) {
    console.warn("[bff:payment] 다른 상점의 결제 건", { paymentId, storeId: payment.storeId });
    return { ok: false, response: fail(404, "payment_not_found", "결제 건을 찾을 수 없습니다.") };
  }

  // 아직 끝나지 않은 결제(가상계좌 발급 등)와 실패한 결제를 갈라 본다.
  if (payment.status !== "PAID") {
    if (payment.status === "FAILED" || payment.status === "CANCELLED") {
      return {
        ok: false,
        response: fail(400, "payment_failed", "결제가 완료되지 않았습니다."),
      };
    }
    return {
      ok: false,
      response: fail(409, "payment_pending", "아직 결제가 완료되지 않았습니다."),
    };
  }

  if (payment.currency !== CURRENCY) {
    return { ok: false, response: badRequest("결제 통화가 올바르지 않습니다.", "invalid_currency") };
  }

  const custom = parseCustomData(payment.customData);
  if (!custom.ok) return { ok: false, response: custom.response };

  // 구매자를 확정한다. 브라우저 경로는 로그인한 사람과 같은지 보고, 웹훅 경로는
  // 로그인한 사람이 없으므로 customData 의 사용자가 실재하는지 본다.
  const buyerId = custom.value.userID;
  if (actor.kind === "session") {
    if (buyerId !== actor.viewerId) {
      console.warn("[bff:payment] 구매자 불일치", { paymentId, viewerId: actor.viewerId });
      return { ok: false, response: fail(403, "forbidden", "본인의 결제 건이 아닙니다.") };
    }
  } else if (!(await actor.userExists(buyerId))) {
    console.warn("[bff:payment] 없는 구매자", { paymentId, buyerId });
    return { ok: false, response: fail(403, "forbidden", "구매자를 확인하지 못했습니다.") };
  }

  const { data: productRow, error: productError } = await supabase
    .from("product")
    .select(PRODUCT_COLUMNS_FOR_PAYMENT)
    .eq("id", custom.value.productID)
    .eq("status", PUBLIC_STATUS)
    .maybeSingle();

  if (productError || !productRow) {
    console.error("[bff:payment] 상품 조회 실패", { paymentId, error: productError });
    return { ok: false, response: fail(404, "not_found", "상품을 찾을 수 없습니다.") };
  }

  // 인원 상한은 1회 신청 상한과 정원 중 낮은 쪽이다. 화면도 같은 값으로 막지만
  // 최종 판정은 여기다.
  const maxCount = Math.max(1, Math.min(MAX_PER_ORDER, productRow.capacity));
  if (custom.value.headcount > maxCount) {
    return { ok: false, response: badRequest("신청 인원이 상한을 넘었습니다.", "invalid_headcount") };
  }

  // price 는 numeric 이라 드라이버에 따라 문자열로 실려 온다.
  const unitPrice = Number(productRow.price);
  const expected = unitPrice * custom.value.headcount;
  if (payment.amount.total !== expected) {
    console.warn("[bff:payment] 금액 불일치", {
      paymentId,
      paid: payment.amount.total,
      expected,
    });
    return { ok: false, response: badRequest("결제 금액이 맞지 않습니다.", "amount_mismatch") };
  }

  if (payment.orderName !== productRow.name) {
    console.warn("[bff:payment] 주문명 불일치", { paymentId, orderName: payment.orderName });
    return { ok: false, response: badRequest("주문 정보가 맞지 않습니다.", "order_mismatch") };
  }

  const snapshotProduct: ProductSnapshot = {
    ...productRow,
    price: unitPrice,
    headcount: custom.value.headcount,
  };

  // 스냅샷 먼저. payment.payment_snapshot_id 가 NOT NULL 이라 id 를 먼저 알아야 한다.
  const snapshotId = await insertSnapshot(supabase, payment, snapshotProduct);
  if (!snapshotId) {
    return { ok: false, response: fail(500, "internal_error", "결제 기록에 실패했습니다.") };
  }

  const { error: insertError } = await supabase.from("payment").insert({
    transction_key: paymentId,
    type: PAYMENT_TYPE.paid,
    // 결제는 양수로 쌓는다. 취소가 붙으면 같은 transction_key 에 음수 행이 하나 더 는다.
    amount: signedAmount(PAYMENT_TYPE.paid, expected),
    product_id: productRow.id,
    user_id: buyerId,
    payment_snapshot_id: snapshotId,
  });

  if (insertError) {
    // 방금 넣은 스냅샷을 되돌린다. PostgREST 는 두 호출을 한 트랜잭션으로 묶어 주지 않는다.
    await supabase.from("payment_snapshot").delete().eq("id", snapshotId);

    // 같은 결제 건이 동시에 두 번 들어온 경우 —— 브라우저와 웹훅이 겹치는 건 드문 일이
    // 아니다. 유니크 인덱스 `(transction_key, type)` 가 두 번째 행을 막아 주므로
    // 여기서는 오류가 아니라 멱등하게 다시 조회해 돌려준다.
    if (insertError.code === "23505") {
      const raced = await findRecorded(supabase, paymentId);
      if (raced) return { ok: true, receipt: raced, alreadyRecorded: true };
      // 이미 있는데 안 보인다 = 남이 기록한 결제 건이다(세션 경로는 RLS 로 가려진다).
      console.warn("[bff:payment] 이미 기록된 결제 건", { paymentId });
      return { ok: false, response: fail(409, "already_recorded", "이미 처리된 결제입니다.") };
    }
    console.error("[bff:payment] 결제 기록 실패", { paymentId, error: insertError });
    return { ok: false, response: fail(500, "internal_error", "결제 기록에 실패했습니다.") };
  }

  return {
    ok: true,
    receipt: toReceipt(paymentId, snapshotProduct, payment, expected),
    alreadyRecorded: false,
  };
}
