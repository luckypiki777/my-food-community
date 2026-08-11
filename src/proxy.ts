import type { NextRequest } from "next/server";

import { createSupabaseProxyClient } from "@/lib/supabase/server";

/**
 * Next 16의 proxy (구 middleware).
 *
 * 하는 일은 하나다: 만료가 임박한 액세스 토큰을 갱신해 새 쿠키를 응답에 실어준다.
 * 이게 없으면 세션이 조용히 끊기고 랜덤 로그아웃처럼 보인다.
 *
 * 인가 판단은 여기서 하지 않는다. 각 BFF 라우트가 자기 몫을 검사한다.
 */
export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createSupabaseProxyClient(request);

  // getSession() 은 쿠키를 그대로 믿기 때문에 proxy 에서 쓰면 안 된다.
  // getClaims() 는 서명을 검증하고, 필요하면 토큰 갱신까지 트리거한다.
  await supabase.auth.getClaims();

  return getResponse();
}

export const config = {
  // 정적 자산은 건너뛴다. 매 요청마다 세션을 갱신할 이유가 없다.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
