import type { NextRequest } from "next/server";

import {
  MAX_PLACE_IMAGES,
  MIN_PLACE_IMAGES,
  PLACE_COLUMNS,
  PLACE_IMAGE_COLUMNS,
  collectImageFiles,
  fetchAuthors,
  forbiddenPlace,
  notFoundPlace,
  parseContent,
  parseOptionalLocation,
  parsePlaceId,
  parseTitle,
  removePlaceImageObjects,
  selectActivePlaces,
  toPlaceDetail,
  uploadPlaceImages,
  type PlaceDetail,
  type PlaceImageRow,
  type PlaceRow,
} from "@/lib/bff/place";
import {
  badRequest,
  fromSupabaseError,
  noContent,
  ok,
  unauthorized,
} from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type PlaceDetailResponse = { place: PlaceDetail };

type RouteContext = { params: Promise<{ id: string }> };

/** 맛집 상세. 사진은 등록 순서대로 전부 내려준다. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const viewerId = await getAuthenticatedUserId(supabase);
  if (!viewerId) return unauthorized();

  const id = parsePlaceId((await params).id);
  if (!id.ok) return id.response;

  // 소프트 삭제된 글은 상세로도 열리지 않는다.
  const { data, error } = await selectActivePlaces(supabase).eq("id", id.value).maybeSingle();

  if (error) return fromSupabaseError(error, "places/[id]#GET");
  if (!data) return notFoundPlace();

  const authors = await fetchAuthors(supabase, [data.user_id]);

  return ok<PlaceDetailResponse>({
    place: toPlaceDetail(data, data.place_image, authors.get(data.user_id) ?? null, viewerId),
  });
}

/**
 * 맛집 수정. 보낸 항목만 바뀐다.
 *  - `title`            : 있으면 교체. 규칙은 등록과 같다.
 *  - `content`          : 있으면 교체. 10자 이상.
 *  - `images`           : 새로 추가할 사진. 기존 사진 뒤에 붙는다.
 *  - `remove_image_ids` : 지울 `place_image.id`. 여러 번 실어도 되고 콤마로 이어도 된다.
 *  - `address` · `name` · `lat` · `lng` : 지도 정보. 안 보내면 그대로 두고,
 *    보내면 **넷 다** 보내야 한다. 일부만 바꾸면 주소와 핀이 서로 다른 곳을 가리킨다.
 *
 * 지우고 더한 뒤에도 사진은 1장 이상 남아야 한다.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return unauthorized();

  const id = parsePlaceId((await params).id);
  if (!id.ok) return id.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("multipart/form-data 형식으로 보내주세요.");
  }

  // 보낸 항목만 바꾼다. 값이 비었는지가 아니라 키가 실렸는지로 판단해야
  // "제목을 빈 문자열로 보냄"(= 잘못된 입력)과 "제목을 안 보냄"(= 유지)을 구분할 수 있다.
  let title: string | null = null;
  if (form.has("title")) {
    const parsed = parseTitle(form.get("title"));
    if (!parsed.ok) return parsed.response;
    title = parsed.value;
  }

  let content: string | null = null;
  if (form.has("content")) {
    const parsed = parseContent(form.get("content"));
    if (!parsed.ok) return parsed.response;
    content = parsed.value;
  }

  // 지도 정보는 통째로 오거나 아예 안 온다. 반쪽짜리는 여기서 400 으로 끊긴다.
  const location = parseOptionalLocation(form);
  if (!location.ok) return location.response;

  const removeIds: string[] = [];
  for (const entry of form.getAll("remove_image_ids")) {
    if (typeof entry !== "string") {
      return badRequest("삭제할 사진 id 가 올바르지 않습니다.", "invalid_remove_image_ids");
    }
    for (const candidate of entry.split(",")) {
      const trimmed = candidate.trim();
      if (trimmed !== "") removeIds.push(trimmed);
    }
  }
  const removing = new Set(removeIds);

  const files = collectImageFiles(form);
  if (!files.ok) return files.response;

  if (
    title === null &&
    content === null &&
    location.value === null &&
    removing.size === 0 &&
    files.value.length === 0
  ) {
    return badRequest("변경할 내용이 없습니다.");
  }

  // 소프트 삭제된 글은 수정 대상이 아니다. 여기서 404 로 끊긴다.
  const current = await selectActivePlaces(supabase).eq("id", id.value).maybeSingle();

  if (current.error) return fromSupabaseError(current.error, "places/[id]#PATCH:read");
  if (!current.data) return notFoundPlace();
  // RLS 도 남의 글 수정을 막지만, 그대로 두면 "권한 없음"이 아니라 "0건 수정됨"으로 나와
  // 성공한 것처럼 보인다. 여기서 미리 끊어 제대로 된 상태코드를 준다.
  if (current.data.user_id !== userId) return forbiddenPlace();

  const currentImages: PlaceImageRow[] = current.data.place_image;
  const knownIds = new Set(currentImages.map((image) => image.id));
  const unknown = [...removing].filter((imageId) => !knownIds.has(imageId));
  if (unknown.length > 0) {
    return badRequest("이 맛집의 사진이 아닙니다.", "unknown_image");
  }

  const finalCount = currentImages.length - removing.size + files.value.length;
  if (finalCount < MIN_PLACE_IMAGES) {
    return badRequest("사진은 최소 1장 남겨야 합니다.", "images_required");
  }
  if (finalCount > MAX_PLACE_IMAGES) {
    return badRequest(`사진은 ${MAX_PLACE_IMAGES}장까지 올릴 수 있습니다.`, "too_many_images");
  }

  // 순서가 중요하다. PostgREST 호출은 한 트랜잭션으로 묶이지 않으므로
  // 중간에 실패해도 "사진 0장" 같은 상태가 나오지 않도록 배치한다.
  //  1) 글 수정 — 제약 위반이 나올 가능성이 가장 큰 단계라 스토리지를 건드리기 전에 끝낸다.
  //  2) 업로드 → 3) 사진 행 추가 → 4) 사진 행 삭제
  //     추가를 삭제보다 먼저 해야 어느 지점에서 멈춰도 장수가 1 밑으로 떨어지지 않는다.
  //  5) 파일 삭제 — DB 에서 지워진 걸 확인한 뒤에야 실제 파일을 지운다.
  let row: PlaceRow = current.data;
  if (title !== null || content !== null || location.value !== null) {
    const updated = await supabase
      .from("place")
      .update({
        ...(title !== null ? { title } : {}),
        ...(content !== null ? { content } : {}),
        ...(location.value !== null ? location.value : {}),
      })
      .eq("id", id.value)
      .select(PLACE_COLUMNS)
      .single();

    if (updated.error) return fromSupabaseError(updated.error, "places/[id]#PATCH:update");
    row = updated.data;
  }

  let added: PlaceImageRow[] = [];
  if (files.value.length > 0) {
    const uploaded = await uploadPlaceImages(supabase, userId, files.value);
    if (!uploaded.ok) return uploaded.response;

    // 새 사진은 기존 사진 뒤에 붙는다. 중간에 삭제가 생겨 sort_order 에 구멍이 나도
    // 정렬 기준으로만 쓰므로 값이 연속일 필요는 없다.
    const nextOrder = currentImages.reduce((max, image) => Math.max(max, image.sort_order), -1) + 1;

    const inserted = await supabase
      .from("place_image")
      .insert(
        uploaded.value.map((path, index) => ({
          place_id: id.value,
          image_path: path,
          sort_order: nextOrder + index,
        })),
      )
      .select(PLACE_IMAGE_COLUMNS);

    if (inserted.error) {
      await removePlaceImageObjects(supabase, uploaded.value);
      return fromSupabaseError(inserted.error, "places/[id]#PATCH:images");
    }
    added = inserted.data;
  }

  let removedPaths: string[] = [];
  if (removing.size > 0) {
    const deleted = await supabase
      .from("place_image")
      .delete()
      .eq("place_id", id.value)
      .in("id", [...removing])
      .select("image_path");

    if (deleted.error) return fromSupabaseError(deleted.error, "places/[id]#PATCH:remove");
    removedPaths = deleted.data.map((image) => image.image_path);
  }

  // DB 반영이 끝난 뒤에 파일을 지운다. 순서가 반대면 DB 가 실패했을 때
  // 행은 남았는데 사진만 사라진다.
  await removePlaceImageObjects(supabase, removedPaths);

  const remaining = currentImages.filter((image) => !removing.has(image.id));
  const authors = await fetchAuthors(supabase, [userId]);

  return ok<PlaceDetailResponse>({
    place: toPlaceDetail(row, [...remaining, ...added], authors.get(userId) ?? null, userId),
  });
}

/**
 * 맛집 삭제 — 소프트 삭제다. `deleted_at` 에 시각만 찍는다.
 *
 * 행도 사진 행도 스토리지 파일도 그대로 둔다. 되돌릴 수 있어야 소프트 삭제고,
 * 파일까지 지우면 되돌릴 게 남지 않는다.
 *
 * 조회에서 빠지는 건 두 겹이다: BFF 의 selectActivePlaces 필터와 place 의 SELECT 정책.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return unauthorized();

  const id = parsePlaceId((await params).id);
  if (!id.ok) return id.response;

  const current = await supabase
    .from("place")
    .select("id, user_id, deleted_at")
    .eq("id", id.value)
    .maybeSingle();

  if (current.error) return fromSupabaseError(current.error, "places/[id]#DELETE:read");
  // 이미 지운 글은 없는 글과 같게 취급한다. 남의 글인지 여부도 알려주지 않는다.
  if (!current.data || current.data.deleted_at !== null) return notFoundPlace();
  // RLS 도 막지만, 그대로 두면 "0건 수정됨"이 성공처럼 보인다. 여기서 제대로 된 상태코드를 준다.
  if (current.data.user_id !== userId) return forbiddenPlace();

  const deleted = await supabase
    .from("place")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.value)
    // 두 번 눌러도 처음 지운 시각이 덮어써지지 않는다.
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (deleted.error) return fromSupabaseError(deleted.error, "places/[id]#DELETE");
  if (!deleted.data) return notFoundPlace();

  return noContent();
}
