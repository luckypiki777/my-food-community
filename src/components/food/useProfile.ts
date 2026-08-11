"use client";

import { useCallback, useEffect, useState } from "react";

/** `/api/profile` 이 내려주는 프로필. 스토리지 주소는 서버가 이미 조립해 뒀다. */
export type Profile = {
  nickname: string;
  /** 테이블에 저장된 스토리지 경로. 화면에서 직접 쓸 일은 없다. */
  imagePath: string | null;
  /** 바로 `<img src>` 에 넣을 수 있는 공개 URL. 사진이 없으면 null. */
  imageUrl: string | null;
};

export type ProfileStatus = "loading" | "ready" | "error";

export type ProfileSaveInput = {
  nickname?: string;
  imageFile?: File | null;
  removeImage?: boolean;
};

export type ProfileSaveResult = { ok: true } | { ok: false; message: string };

type ErrorBody = { error?: { code?: string; message?: string } };

const FALLBACK_ERROR = "프로필을 저장하지 못했어요. 다시 시도해 주세요.";

/**
 * 프로필을 BFF에서 가져오고 저장한다.
 *
 * CLAUDE.md 규약대로 브라우저는 Supabase를 직접 부르지 않는다.
 * 스토리지 업로드도 `/api/profile` 이 대신 한다.
 *
 * @param enabled 로그인 상태일 때만 부른다. 비로그인 상태에서 부르면 401만 쌓인다.
 */
export function useProfile(enabled: boolean) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [lastEnabled, setLastEnabled] = useState(enabled);

  // 로그인/로그아웃 경계에서 값을 비운다. 이렇게 안 하면 로그아웃 직후
  // 다음 사용자에게 이전 사용자의 닉네임과 사진이 한 프레임 보인다.
  // effect 가 아니라 렌더 중에 맞추는 이유: effect 로 하면 잘못된 값이 이미 한 번 그려진 뒤다.
  if (lastEnabled !== enabled) {
    setLastEnabled(enabled);
    setProfile(null);
    setStatus("loading");
  }

  useEffect(() => {
    if (!enabled) return;

    // 언마운트 후 setState 를 막는다. StrictMode 이중 실행에서도 안전하다.
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error(`profile responded ${res.status}`);
        const body = (await res.json()) as { profile: Profile };
        if (cancelled) return;
        setProfile(body.profile);
        setStatus("ready");
      } catch {
        // 프로필을 못 불러와도 화면은 떠야 한다. 마이 화면이 구글 계정 정보로 떨어진다.
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const saveProfile = useCallback(
    async (input: ProfileSaveInput): Promise<ProfileSaveResult> => {
      // 파일이 섞이므로 JSON 이 아니라 FormData 로 보낸다.
      // Content-Type 은 브라우저가 boundary 까지 붙여 직접 정한다. 손대면 안 된다.
      const form = new FormData();
      if (input.nickname !== undefined) form.set("nickname", input.nickname);
      if (input.imageFile) form.set("image", input.imageFile);
      if (input.removeImage) form.set("remove_image", "1");

      try {
        const res = await fetch("/api/profile", { method: "PATCH", body: form });
        const body: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          const message = (body as ErrorBody | null)?.error?.message;
          return { ok: false, message: message ?? FALLBACK_ERROR };
        }

        setProfile((body as { profile: Profile }).profile);
        setStatus("ready");
        return { ok: true };
      } catch {
        return { ok: false, message: "네트워크 문제로 저장하지 못했어요." };
      }
    },
    [],
  );

  return { profile, status, saveProfile };
}
