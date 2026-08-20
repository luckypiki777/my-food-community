import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * 요청 단위 Supabase 클라이언트.
 *
 * BFF(Route Handler / Server Action)에서만 호출한다. `server-only` 덕분에
 * 클라이언트 컴포넌트가 실수로 import 하면 빌드가 실패한다.
 *
 * 사용자 세션 쿠키를 그대로 실어 보내므로 모든 쿼리에 RLS가 적용된다.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component 렌더 중에는 쿠키를 쓸 수 없다.
            // 갱신된 토큰은 src/proxy.ts 가 응답에 반영하므로 무시해도 안전하다.
          }
        },
      },
    },
  );
}

/**
 * `src/proxy.ts` 전용 클라이언트.
 *
 * proxy 에서는 `next/headers` 대신 요청/응답 객체로 쿠키를 다뤄야 해서 별도 팩토리를 둔다.
 * 토큰이 갱신되면 setAll 이 응답을 새로 만들기 때문에 반드시 `getResponse()` 로 최종 응답을 받아야 한다.
 */
export function createSupabaseProxyClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // 인증 쿠키가 실린 응답이 CDN에 캐시되면 남의 세션이 새어나간다.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  return { supabase, getResponse: () => response };
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** `getClaims()` 가 돌려주는 claims 타입. SDK 버전 따라 이름이 바뀌어서 추론으로 받는다. */
type AuthClaims = NonNullable<
  Awaited<ReturnType<SupabaseServerClient["auth"]["getClaims"]>>["data"]
>["claims"];

/** 검증된 사용자 신원. 표시용 필드만 담는다. */
export type AuthenticatedIdentity = {
  id: string;
  email: string | null;
  /** 구글 계정 표시 이름. 없을 수 있다. */
  name: string | null;
  /** 구글이 호스팅하는 아바타. 우리 스토리지의 프로필 사진과는 별개다. */
  avatarUrl: string | null;
};

/**
 * claims → 화면에서 쓰는 사용자 신원.
 *
 * `user_metadata` 는 사용자가 수정할 수 있다. 표시용으로만 쓰고 인가 판단에는 절대 쓰지 않는다.
 * 인가에 쓸 수 있는 건 서명에 포함된 `sub` 뿐이다.
 */
export function toIdentity(claims: AuthClaims): AuthenticatedIdentity {
  const meta = claims.user_metadata ?? {};
  return {
    id: claims.sub,
    email: claims.email ?? null,
    name: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  };
}

/**
 * 인가 게이트. 로그인 상태가 아니면 `null`.
 *
 * `getSession()` 은 쿠키 내용을 그대로 믿기 때문에 인가 판단에 쓰면 안 된다.
 * `getClaims()` 는 JWT 서명을 검증하므로 BFF의 인가 게이트로 안전하다.
 *
 * 라우트에서 이미 클라이언트를 만들었다면 넘겨서 재사용한다.
 */
export async function getAuthenticatedIdentity(
  client?: SupabaseServerClient,
): Promise<AuthenticatedIdentity | null> {
  const supabase = client ?? (await createSupabaseServerClient());
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return toIdentity(data.claims);
}

/** 사용자 ID만 필요할 때. 자세한 건 {@link getAuthenticatedIdentity}. */
export async function getAuthenticatedUserId(
  client?: SupabaseServerClient,
): Promise<string | null> {
  return (await getAuthenticatedIdentity(client))?.id ?? null;
}

/**
 * **RLS 를 통째로 우회하는 클라이언트.** 포트원 웹훅 전용이다.
 *
 * 웹훅은 포트원 서버가 부른다 — 로그인한 사람도, 세션 쿠키도 없다. 그런데 `payment` 의
 * RLS 는 `auth.uid() = user_id` 라, 세션 없는 요청으로는 결제 행을 넣을 방법이 아예 없다.
 * 그래서 이 한 경로에만 secret 키를 쓴다.
 *
 * **다른 곳에서 부르지 않는다.** 이 키는 모든 정책을 건너뛰므로, 여기서 도는 코드는
 * "누가 요청했는지" 를 스스로 증명해야 한다. 웹훅의 경우 그 증명은 서명 검증
 * (`paymentWebhook.ts`)과 포트원 결제 조회 두 겹이다.
 *
 * 세션 갱신이 필요 없으므로 쿠키·토큰 자동 갱신을 모두 끈다.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** secret 키가 설정돼 있는가. 없으면 웹훅은 결제를 기록할 수 없다. */
export function hasSupabaseAdminKey(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}
