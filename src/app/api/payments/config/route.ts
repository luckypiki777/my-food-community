import { canStartPayment, portoneConfig } from "@/lib/bff/payment";
import { ok, unauthorized } from "@/lib/bff/response";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

/**
 * 결제창을 띄우는 데 필요한 값. 브라우저가 `PortOne.requestPayment()` 에 그대로 넣는다.
 *
 * `configured: false` 면 아직 키를 다 안 넣은 것이다 — 화면은 결제 버튼을 잠그고
 * 이유를 띄운다.
 */
export type PaymentConfigResponse =
  | { configured: false }
  | { configured: true; storeId: string; channelKey: string };

/**
 * 결제 설정 조회.
 *
 * 상점 아이디와 채널 키는 어차피 결제창을 열 때 브라우저까지 나가는 값이다. 그래도
 * `NEXT_PUBLIC_` 으로 번들에 박지 않는 이유는 지도 키(`/api/map/config`)와 같다 —
 * 환경변수를 서버 한쪽에만 두면 값을 바꿔도 다시 빌드할 필요가 없다.
 *
 * **API 시크릿은 절대 여기로 내려가지 않는다.** 그 값은 결제 검증(`/api/payments/complete`)
 * 이 서버에서만 쓴다.
 *
 * 지도 키와 달리 로그인 게이트를 둔다. 결제 시트는 로그인한 뒤에만 열리므로 잃을 게 없고,
 * 우리 상점 정보를 아무에게나 흘릴 이유도 없다.
 */
export async function GET() {
  const viewerId = await getAuthenticatedUserId();
  if (!viewerId) return unauthorized();

  // 결제창 값 둘만 보고 열어주면 안 된다. 시크릿이 없으면 결제창은 뜨고 승인도 나는데
  // 완료 처리만 503 으로 막혀서, 돈은 나갔는데 기록은 없는 상태가 된다.
  // 셋이 다 있을 때만 결제를 시작하게 한다 (`canStartPayment`).
  const config = portoneConfig();
  if (!config || !canStartPayment()) {
    return ok<PaymentConfigResponse>({ configured: false });
  }

  // 통화·결제수단은 환경변수가 아니라 코드 상수다. 화면 쪽 같은 값은
  // `src/components/food/portone.ts` 에 있고, 서버의 검증 기준은 `lib/bff/payment.ts` 다.
  return ok<PaymentConfigResponse>({
    configured: true,
    storeId: config.storeId,
    channelKey: config.channelKey,
  });
}
