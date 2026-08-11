import type { NextRequest } from "next/server";

import { badRequest, fail, fromSupabaseError, ok, unauthorized } from "@/lib/bff/response";
import {
  createSupabaseServerClient,
  getAuthenticatedIdentity,
  type AuthenticatedIdentity,
  type SupabaseServerClient,
} from "@/lib/supabase/server";
import {
  MAX_IMAGE_BYTES,
  PROFILE_IMAGE_BUCKET,
  buildOwnedImagePath,
  imageExtension,
  profileImageUrl,
} from "@/lib/supabase/storage";

/** 화면이 쓰는 프로필. 스토리지 경로와, 그걸로 조립한 공개 URL을 함께 준다. */
export type ProfileResponse = {
  profile: {
    nickname: string;
    /** 테이블에 저장된 값. `<user_id>/<uuidv4>.<ext>` */
    imagePath: string | null;
    /** `SUPABASE_STORAGE_URL` 과 조립한 공개 URL. 사진이 없으면 null. */
    imageUrl: string | null;
  };
};

/** DB의 profile_nickname_length 체크 제약과 같은 값이다. 둘 중 하나만 바꾸면 안 된다. */
const NICKNAME_MIN = 1;
const NICKNAME_MAX = 20;

/** 테이블에서 화면이 쓰는 컬럼만 고른다. */
const PROFILE_COLUMNS = "nickname, image_path" as const;

type ProfileRow = { nickname: string; image_path: string | null };

function toResponse(row: ProfileRow): ProfileResponse {
  return {
    profile: {
      nickname: row.nickname,
      imagePath: row.image_path,
      imageUrl: profileImageUrl(row.image_path),
    },
  };
}

/**
 * 구글 로그인 직후에는 아직 프로필 행이 없다. 그때 쓸 초기 닉네임.
 * 표시 이름이 없는 계정이 있어서 이메일 아이디까지 떨어뜨린다.
 */
function seedNickname(identity: AuthenticatedIdentity): string {
  const candidate = identity.name?.trim() || identity.email?.split("@")[0]?.trim() || "이웃";
  return candidate.slice(0, NICKNAME_MAX);
}

function readProfile(supabase: SupabaseServerClient, userId: string) {
  return supabase.from("profile").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle();
}

/**
 * 현재 사용자의 프로필 조회.
 *
 * user 와 profile 은 1:1 이라 로그인한 사용자에게는 항상 행이 하나 있어야 한다.
 * 첫 조회 때 아직 없으면 구글 계정 정보로 만들어 준다.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const identity = await getAuthenticatedIdentity(supabase);
  if (!identity) return unauthorized();

  const { data, error } = await readProfile(supabase, identity.id);
  if (error) return fromSupabaseError(error, "profile#GET");
  if (data) return ok(toResponse(data));

  const created = await supabase
    .from("profile")
    .insert({ user_id: identity.id, nickname: seedNickname(identity) })
    .select(PROFILE_COLUMNS)
    .single();

  if (created.error) {
    // 23505 = unique 위반. 같은 사용자의 요청 두 개가 동시에 들어와 다른 쪽이 먼저 만든 경우다.
    // 에러가 아니라 정상 경합이므로 다시 읽어서 돌려준다.
    if (created.error.code !== "23505") {
      return fromSupabaseError(created.error, "profile#GET:provision");
    }
    const retry = await readProfile(supabase, identity.id);
    if (retry.error) return fromSupabaseError(retry.error, "profile#GET:retry");
    if (!retry.data) return fail(500, "internal_error", "프로필을 만들지 못했습니다.");
    return ok(toResponse(retry.data));
  }

  return ok(toResponse(created.data));
}

/**
 * 닉네임 / 프로필 사진 변경.
 *
 * 파일이 섞이므로 JSON 이 아니라 `multipart/form-data` 로 받는다.
 *  - `nickname`     : 바꿀 닉네임. 없으면 기존 값 유지.
 *  - `image`        : 새 프로필 사진 파일. 없으면 기존 사진 유지.
 *  - `remove_image` : `"1"` 이면 사진을 지운다.
 *
 * 실제 삭제/정리 순서가 중요하다. 아래 주석 참고.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const identity = await getAuthenticatedIdentity(supabase);
  if (!identity) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("multipart/form-data 형식으로 보내주세요.");
  }

  const rawNickname = form.get("nickname");
  const rawImage = form.get("image");
  const removeImage = form.get("remove_image") === "1";

  if (rawNickname !== null && typeof rawNickname !== "string") {
    return badRequest("닉네임 형식이 올바르지 않습니다.");
  }
  if (rawImage !== null && !(rawImage instanceof File)) {
    return badRequest("이미지 형식이 올바르지 않습니다.");
  }
  if (rawImage && removeImage) {
    return badRequest("사진 변경과 삭제를 동시에 요청할 수 없습니다.");
  }
  if (rawNickname === null && !rawImage && !removeImage) {
    return badRequest("변경할 내용이 없습니다.");
  }

  let nickname: string | null = null;
  if (rawNickname !== null) {
    nickname = rawNickname.trim();
    if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
      return badRequest(
        `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`,
        "invalid_nickname",
      );
    }
  }

  // 확장자는 파일명이 아니라 MIME 에서 뽑는다. 버킷에도 같은 제한이 걸려 있다.
  let extension: string | null = null;
  if (rawImage) {
    if (rawImage.size === 0) return badRequest("빈 파일입니다.", "empty_file");
    if (rawImage.size > MAX_IMAGE_BYTES) {
      return badRequest(
        `사진은 ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하만 올릴 수 있습니다.`,
        "image_too_large",
      );
    }
    extension = imageExtension(rawImage.type);
    if (!extension) {
      return badRequest("JPG · PNG · WebP · GIF 만 올릴 수 있습니다.", "unsupported_image_type");
    }
  }

  const current = await readProfile(supabase, identity.id);
  if (current.error) return fromSupabaseError(current.error, "profile#PATCH:read");

  const previousPath = current.data?.image_path ?? null;
  let nextPath = removeImage ? null : previousPath;

  if (rawImage && extension) {
    const path = buildOwnedImagePath(identity.id, extension);
    const upload = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .upload(path, rawImage, { contentType: rawImage.type, upsert: false });

    if (upload.error) {
      console.error("[bff:profile#PATCH] upload", upload.error);
      return fail(502, "upload_failed", "사진을 업로드하지 못했습니다.");
    }
    nextPath = path;
  }

  // 행이 없으면 만들고, 있으면 고친다. user_id 의 unique index 로 충돌을 잡는다.
  const saved = await supabase
    .from("profile")
    .upsert(
      {
        user_id: identity.id,
        nickname: nickname ?? current.data?.nickname ?? seedNickname(identity),
        image_path: nextPath,
      },
      { onConflict: "user_id" },
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (saved.error) {
    // DB 가 실패했는데 파일만 남으면 아무도 참조하지 않는 고아가 된다. 되돌린다.
    if (nextPath && nextPath !== previousPath) {
      await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([nextPath]);
    }
    return fromSupabaseError(saved.error, "profile#PATCH:write");
  }

  // 이전 사진 정리는 DB 반영이 끝난 뒤에 한다. 순서가 반대면
  // DB 가 실패했을 때 멀쩡한 사진만 날아간다.
  // 여기서 실패해도 사용자 요청 자체는 이미 성공이므로 로그만 남긴다.
  if (previousPath && previousPath !== nextPath) {
    const cleanup = await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([previousPath]);
    if (cleanup.error) {
      console.warn("[bff:profile#PATCH] 이전 사진 삭제 실패", {
        path: previousPath,
        error: cleanup.error,
      });
    }
  }

  return ok(toResponse(saved.data));
}
