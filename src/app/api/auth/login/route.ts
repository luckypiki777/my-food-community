import { NextResponse, type NextRequest } from "next/server";

import { badRequest, fail, fromSupabaseError } from "@/lib/bff/response";
import { originFor, safeNextPath } from "@/lib/bff/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 허용한 소셜 제공자만 통과시킨다. 값이 그대로 Supabase로 넘어가므로 화이트리스트로 막는다. */
const PROVIDERS = ["google"] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

/**
 * 소셜 로그인 시작점.
 *
 * 클라이언트는 `window.location.href = "/api/auth/login?provider=google"` 처럼
 * 이 라우트로 이동하기만 한다. PKCE code verifier 쿠키는 서버에서 심는다.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const provider = params.get("provider") ?? "google";

  if (!isProvider(provider)) {
    return badRequest(`지원하지 않는 로그인 수단입니다: ${provider}`, "unsupported_provider");
  }

  const origin = originFor(request);
  const next = safeNextPath(params.get("next"));
  const callback = new URL("/api/auth/callback", origin);
  callback.searchParams.set("next", next);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });

  if (error) return fromSupabaseError(error, "auth/login");
  if (!data.url) {
    return fail(502, "auth_unavailable", "로그인 페이지를 열지 못했습니다.");
  }

  // 303: 이후 요청을 GET으로 강제해 제공자 동의 화면으로 넘어가게 한다.
  return NextResponse.redirect(data.url, {
    status: 303,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
