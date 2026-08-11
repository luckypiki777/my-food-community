import { NextResponse, type NextRequest } from "next/server";

import { authErrorRedirect, originFor, safeNextPath } from "@/lib/bff/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * OAuth 제공자가 되돌려보내는 지점.
 * 인가 코드를 세션으로 교환하고 쿠키를 심은 뒤 앱으로 돌려보낸다.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = originFor(request);
  const next = safeNextPath(params.get("next"));

  // 사용자가 동의 화면에서 취소했거나 제공자가 거절한 경우.
  const providerError = params.get("error");
  if (providerError) {
    console.warn("[bff:auth/callback] provider error", {
      error: providerError,
      description: params.get("error_description"),
    });
    return NextResponse.redirect(authErrorRedirect(origin, providerError), { headers: NO_STORE });
  }

  const code = params.get("code");
  if (!code) {
    return NextResponse.redirect(authErrorRedirect(origin, "missing_code"), { headers: NO_STORE });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[bff:auth/callback] exchange failed", error);
    return NextResponse.redirect(authErrorRedirect(origin, error.code ?? "exchange_failed"), {
      headers: NO_STORE,
    });
  }

  // 화면단에서 환영 토스트를 띄우고 파라미터를 지운다.
  const destination = new URL(next, origin);
  destination.searchParams.set("welcome", "1");
  return NextResponse.redirect(destination, { headers: NO_STORE });
}
