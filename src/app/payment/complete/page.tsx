import { redirect } from "next/navigation";

/**
 * 결제창이 돌아오는 자리 — `PortOne.requestPayment()` 의 `redirectUrl`.
 *
 * 모바일 결제는 결제창이 페이지를 통째로 떠났다가 이 주소로 돌아온다. 그래서 앱의
 * React 상태는 이미 다 날아간 뒤다. 여기서 결과를 화면으로 그리려 들면 완료 화면 한 벌을
 * 앱 밖에 또 만들어야 하고, "결제 내역 보기" 같은 다음 걸음도 앱과 따로 놀게 된다.
 *
 * 그래서 이 페이지는 **아무것도 그리지 않는다.** 포트원이 붙여 준 결과를 앱이 아는
 * 이름으로 바꿔 달고 `/` 로 넘긴다. 검증(`/api/payments/complete`)도, 완료 화면도
 * 그 뒤는 `FoodApp` 이 PC 결제와 **같은 한 갈래로** 처리한다.
 *
 * `/api/auth/callback` 이 `?welcome=` / `?auth_error=` 를 달아 앱으로 돌려보내는 것과
 * 같은 방식이다.
 *
 * 서버에서 307 로 넘기므로 빈 화면이 한 번 번쩍이지 않고, 자바스크립트도 필요 없다.
 */
export default async function PaymentRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const forwarded = new URLSearchParams();
  const paymentId = first(params.paymentId);
  const code = first(params.code);

  if (paymentId) forwarded.set("payment_id", paymentId);
  if (code) {
    forwarded.set("payment_error", code);
    const message = first(params.message);
    if (message) forwarded.set("payment_message", message);
    // PG 원문 코드는 사용자에게 보여줄 값이 아니다. 추적용으로 서버 로그에만 남긴다.
    console.warn("[payment/complete] 결제 실패", {
      paymentId,
      code,
      pgCode: first(params.pgCode),
      pgMessage: first(params.pgMessage),
    });
  }

  const query = forwarded.toString();
  redirect(query ? `/?${query}` : "/");
}

/** 같은 키가 여러 번 오면 첫 값만 쓴다. */
function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
