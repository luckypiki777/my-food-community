import "server-only";

import { randomUUID } from "node:crypto";

import { requireEnv } from "@/lib/env";

/** 프로필 사진 버킷. public 이라 읽기는 CDN 경유, 쓰기는 storage RLS 로 막힌다. */
export const PROFILE_IMAGE_BUCKET = "profile-image";

/** 맛집 사진 버킷. 정책과 제한은 profile-image 와 같다. */
export const PLACE_IMAGE_BUCKET = "place-image";

/** 두 버킷의 file_size_limit 과 같은 값. 여기서 먼저 걸러 헛된 업로드를 줄인다. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * 확장자는 파일명이 아니라 MIME 에서 뽑는다.
 * 파일명은 사용자가 정하는 값이라 `evil.png.html` 같은 걸 그대로 믿으면 안 된다.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** 두 버킷의 allowed_mime_types 와 같은 목록. */
export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(EXTENSION_BY_MIME);

export function imageExtension(mimeType: string): string | null {
  return EXTENSION_BY_MIME[mimeType] ?? null;
}

/**
 * 업로드 경로: `<user_id>/<uuidv4>.<ext>`
 *
 * 파일명은 요구대로 uuidv4 다. 앞에 소유자 uid 폴더를 두는 이유는
 * storage RLS 가 `(storage.foldername(name))[1] = auth.uid()` 로
 * 남의 폴더에 쓰는 걸 막을 수 있게 하기 위해서다.
 *
 * 매번 새 uuid 를 쓰므로 덮어쓰기가 없고, CDN 캐시가 옛 사진을 물고 있을 일도 없다.
 */
export function buildOwnedImagePath(userId: string, extension: string): string {
  return `${userId}/${randomUUID()}.${extension}`;
}

/**
 * 테이블에는 경로만 저장한다. 공개 URL 은 BFF 가 응답할 때 조립해서 내려준다.
 *
 * 이렇게 해야 스토리지 주소가 바뀌어도 DB 를 건드릴 필요가 없고,
 * 브라우저는 환경변수를 몰라도 된다(= NEXT_PUBLIC_ 이 필요 없다).
 */
function publicImageUrl(bucket: string, path: string): string {
  const base = requireEnv("SUPABASE_STORAGE_URL").replace(/\/+$/, "");
  return `${base}/${bucket}/${path}`;
}

/** 프로필 사진은 없을 수 있다(`profile.image_path` 가 nullable). */
export function profileImageUrl(path: string | null): string | null {
  return path ? publicImageUrl(PROFILE_IMAGE_BUCKET, path) : null;
}

/** 맛집 사진은 항상 최소 1장이라 경로가 비는 경우가 없다. */
export function placeImageUrl(path: string): string {
  return publicImageUrl(PLACE_IMAGE_BUCKET, path);
}
