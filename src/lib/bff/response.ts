import "server-only";

import { AuthError, type PostgrestError } from "@supabase/supabase-js";

/** CLAUDE.md 규약: 에러 응답은 항상 이 형태다. */
export type BffErrorBody = { error: { code: string; message: string } };

/**
 * BFF 응답은 전부 사용자별 데이터다. CDN·프록시가 한 사용자의 응답을
 * 다른 사용자에게 주는 일이 없도록 캐시를 막는다.
 */
const NO_STORE = "private, no-store, max-age=0";

function withDefaults(init: ResponseInit | undefined, status: number): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", NO_STORE);
  return { ...init, status: init?.status ?? status, headers };
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, withDefaults(init, 200));
}

export function noContent(): Response {
  return new Response(null, withDefaults(undefined, 204));
}

export function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies BffErrorBody, withDefaults(undefined, status));
}

export function unauthorized(message = "로그인이 필요합니다."): Response {
  return fail(401, "unauthorized", message);
}

export function badRequest(message: string, code = "invalid_request"): Response {
  return fail(400, code, message);
}

/**
 * Postgres / PostgREST 에러코드 → HTTP 상태 + 사용자에게 보여줄 메시지.
 * 여기에 없는 코드는 5xx로 떨어뜨리고 원본 메시지는 서버 로그에만 남긴다.
 */
const POSTGREST_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  // RLS 정책에 막혔거나 권한이 없음
  "42501": { status: 403, code: "forbidden", message: "권한이 없습니다." },
  PGRST301: { status: 401, code: "unauthorized", message: "로그인이 필요합니다." },
  // .single() 인데 행이 없음
  PGRST116: { status: 404, code: "not_found", message: "대상을 찾을 수 없습니다." },
  // unique 위반
  "23505": { status: 409, code: "conflict", message: "이미 존재하는 값입니다." },
  // foreign key 위반
  "23503": { status: 400, code: "invalid_reference", message: "참조 대상이 올바르지 않습니다." },
  // not-null 위반
  "23502": { status: 400, code: "missing_field", message: "필수 값이 비어 있습니다." },
  // check 제약 위반
  "23514": { status: 400, code: "invalid_value", message: "값이 허용 범위를 벗어났습니다." },
};

/**
 * Supabase 에러를 그대로 흘리지 않고 BFF 응답 규약으로 매핑한다.
 * `context` 는 서버 로그에서 어느 라우트인지 찾기 위한 라벨.
 */
export function fromSupabaseError(
  error: AuthError | PostgrestError,
  context: string,
): Response {
  if (error instanceof AuthError) {
    const status = error.status && error.status >= 400 ? error.status : 401;
    if (status >= 500) {
      console.error(`[bff:${context}] auth`, error);
      return fail(502, "auth_unavailable", "인증 서버와 통신하지 못했습니다.");
    }
    return fail(status, error.code ?? "auth_error", error.message);
  }

  const mapped = POSTGREST_ERRORS[error.code];
  if (mapped) {
    return fail(mapped.status, mapped.code, mapped.message);
  }

  console.error(`[bff:${context}] postgrest`, error);
  return fail(500, "internal_error", "요청을 처리하지 못했습니다.");
}
