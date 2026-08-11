import { fromSupabaseError, ok } from "@/lib/bff/response";
import {
  createSupabaseServerClient,
  toIdentity,
  type AuthenticatedIdentity,
} from "@/lib/supabase/server";

/** 화면에서 쓰는 로그인 상태. 토큰은 절대 내려보내지 않는다. */
export type SessionResponse = {
  user: AuthenticatedIdentity | null;
};

/**
 * 현재 로그인 상태 조회.
 *
 * `getClaims()` 는 JWT 서명을 검증한다. `getSession()` 은 쿠키를 그대로 믿으므로 쓰지 않는다.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) return fromSupabaseError(error, "auth/session");
  if (!data) return ok<SessionResponse>({ user: null });

  return ok<SessionResponse>({ user: toIdentity(data.claims) });
}
