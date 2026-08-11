import { fromSupabaseError, noContent } from "@/lib/bff/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 로그아웃. 세션 쿠키를 지운다.
 *
 * GET이 아니라 POST인 이유: 링크 프리페치나 이미지 태그로 남의 세션을 끊을 수 없게 한다.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) return fromSupabaseError(error, "auth/logout");
  return noContent();
}
