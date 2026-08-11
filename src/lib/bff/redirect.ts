import "server-only";

import type { NextRequest } from "next/server";

/**
 * 오픈 리다이렉트 방지. 앱 내부 경로만 통과시킨다.
 * `//evil.com` 과 `/\evil.com` 은 브라우저가 프로토콜 상대 URL로 해석하므로 함께 막는다.
 */
export function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

/**
 * OAuth `redirectTo` 에 쓸 외부 오리진.
 * 배포 환경에서는 로드밸런서 뒤라 `request.nextUrl.origin` 이 내부 주소일 수 있어
 * `x-forwarded-host` 를 우선한다. 로컬에서는 그대로 요청 오리진을 쓴다.
 */
export function originFor(request: NextRequest): string {
  if (process.env.NODE_ENV === "development") {
    return request.nextUrl.origin;
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!forwardedHost) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${forwardedHost}`;
}

/** 로그인 실패를 앱 진입점으로 되돌린다. 화면단에서 `auth_error` 를 읽어 토스트를 띄운다. */
export function authErrorRedirect(origin: string, code: string): URL {
  const url = new URL("/", origin);
  url.searchParams.set("auth_error", code);
  return url;
}
