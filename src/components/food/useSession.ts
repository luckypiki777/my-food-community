"use client";

import { useCallback, useEffect, useState } from "react";

/** `/api/auth/session` 이 내려주는 사용자. 토큰은 절대 브라우저로 오지 않는다. */
export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type SessionState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous"; user: null };

const ANONYMOUS: SessionState = { status: "anonymous", user: null };

/**
 * 로그인 상태를 BFF에서 가져온다.
 *
 * CLAUDE.md 규약대로 브라우저는 Supabase를 직접 부르지 않는다.
 * 세션 쿠키는 httpOnly라서 JS로 읽을 수 없고, 판단은 항상 서버가 한다.
 */
export function useSession() {
  const [session, setSession] = useState<SessionState>({ status: "loading", user: null });

  useEffect(() => {
    // 언마운트 후 setState 를 막는다. StrictMode 이중 실행에서도 안전하다.
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) throw new Error(`session responded ${res.status}`);
        const body = (await res.json()) as { user: SessionUser | null };
        if (cancelled) return;
        setSession(body.user ? { status: "authenticated", user: body.user } : ANONYMOUS);
      } catch {
        // 네트워크가 끊겼거나 BFF가 죽은 경우. 비로그인으로 떨어뜨리면
        // 로그인 화면이 뜨고 사용자가 다시 시도할 수 있다.
        if (!cancelled) setSession(ANONYMOUS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** 성공하면 true. 실패해도 화면을 강제로 넘기지 않는다. */
  const signOut = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) return false;
      setSession(ANONYMOUS);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { session, signOut };
}

/** 로그인 실패 코드는 `/api/auth/callback` 이 `?auth_error=` 로 붙여 보낸다. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "구글 로그인을 취소했어요.",
  missing_code: "로그인 정보가 전달되지 않았어요. 다시 시도해 주세요.",
  exchange_failed: "로그인을 마무리하지 못했어요. 다시 시도해 주세요.",
  bad_code_verifier: "로그인 세션이 만료됐어요. 다시 시도해 주세요.",
  flow_state_expired: "로그인 세션이 만료됐어요. 다시 시도해 주세요.",
  flow_state_not_found: "로그인 세션을 찾지 못했어요. 다시 시도해 주세요.",
  server_error: "로그인 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.",
};

export function authErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? "로그인에 실패했어요. 다시 시도해 주세요.";
}
