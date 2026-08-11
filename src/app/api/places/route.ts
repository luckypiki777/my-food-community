import type { NextRequest } from "next/server";

import {
  MAX_PLACE_IMAGES,
  MIN_PLACE_IMAGES,
  collectImageFiles,
  fetchAuthors,
  insertPlaceWithImages,
  parseContent,
  parseCursor,
  parseLocation,
  parsePageSize,
  parseTitle,
  selectActivePlaces,
  toPlaceDetail,
  toPlaceSummary,
  type PlaceDetail,
  type PlaceSummary,
} from "@/lib/bff/place";
import { badRequest, fromSupabaseError, ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type PlaceListResponse = {
  places: PlaceSummary[];
  /** 다음 페이지 요청에 그대로 실어 보낸다. 마지막 페이지면 null. */
  nextCursor: number | null;
};

export type PlaceCreateResponse = { place: PlaceDetail };

/**
 * 맛집 목록.
 *
 * `?limit=` (기본 20, 최대 50) · `?cursor=` (직전 페이지의 마지막 id) ·
 * `?mine=1` (내가 쓴 글만).
 *
 * OFFSET 대신 키셋으로 넘긴다. OFFSET 은 건너뛴 행을 매번 다시 훑어서 뒤로 갈수록 느려지고,
 * 넘기는 사이에 새 글이 올라오면 같은 글이 두 번 보이거나 건너뛰어진다.
 * `id` 는 bigint identity 라 최신순 = id 내림차순이고, 기본키 인덱스를 그대로 탄다.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const viewerId = await getAuthenticatedUserId(supabase);
  if (!viewerId) return unauthorized();

  const params = request.nextUrl.searchParams;

  const limit = parsePageSize(params.get("limit"));
  if (!limit.ok) return limit.response;

  const cursor = parseCursor(params.get("cursor"));
  if (!cursor.ok) return cursor.response;

  // 소프트 삭제된 글은 목록에 나오지 않는다. 필터는 selectActivePlaces 안에 있다.
  let query = selectActivePlaces(supabase)
    .order("id", { ascending: false })
    // 한 장 더 받아보고 다음 페이지가 있는지 판단한다. 따로 count 쿼리를 돌리지 않아도 된다.
    .limit(limit.value + 1);

  if (cursor.value !== null) query = query.lt("id", cursor.value);
  // 마이 화면의 "내가 쓴 글". place_user_id_idx 를 탄다.
  if (params.get("mine") === "1") query = query.eq("user_id", viewerId);

  const { data, error } = await query;
  if (error) return fromSupabaseError(error, "places#GET");

  const hasMore = data.length > limit.value;
  const rows = hasMore ? data.slice(0, limit.value) : data;
  const authors = await fetchAuthors(
    supabase,
    rows.map((row) => row.user_id),
  );

  return ok<PlaceListResponse>({
    places: rows.map((row) =>
      toPlaceSummary(row, row.place_image, authors.get(row.user_id) ?? null, viewerId),
    ),
    nextCursor: hasMore && rows.length > 0 ? rows[rows.length - 1].id : null,
  });
}

/**
 * 맛집 등록.
 *
 * 파일이 섞이므로 JSON 이 아니라 `multipart/form-data` 로 받는다.
 *  - `title`  : 필수.
 *  - `content`: 필수, 10자 이상.
 *  - `images` : 필수, 1장 이상. 같은 이름으로 여러 개 실으면 순서대로 저장된다.
 *  - `address` · `name` · `lat` · `lng` : 필수. 지도에서 고른 위치다.
 *
 * 지도 정보는 넷이 한 덩어리라 하나라도 빠지면 등록되지 않는다. DB 도 같은 규칙을 건다.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("multipart/form-data 형식으로 보내주세요.");
  }

  const title = parseTitle(form.get("title"));
  if (!title.ok) return title.response;

  const content = parseContent(form.get("content"));
  if (!content.ok) return content.response;

  const location = parseLocation(form);
  if (!location.ok) return location.response;

  const files = collectImageFiles(form);
  if (!files.ok) return files.response;

  if (files.value.length < MIN_PLACE_IMAGES) {
    return badRequest("사진을 1장 이상 등록해 주세요.", "images_required");
  }
  if (files.value.length > MAX_PLACE_IMAGES) {
    return badRequest(`사진은 ${MAX_PLACE_IMAGES}장까지 올릴 수 있습니다.`, "too_many_images");
  }

  // 글 → 업로드 → 사진 행. 순서와 되돌리기는 insertPlaceWithImages 안에 있다.
  const created = await insertPlaceWithImages(supabase, userId, {
    title: title.value,
    content: content.value,
    location: location.value,
    files: files.value,
  });
  if (!created.ok) return created.response;

  const authors = await fetchAuthors(supabase, [userId]);

  return ok<PlaceCreateResponse>(
    {
      place: toPlaceDetail(
        created.value.row,
        created.value.images,
        authors.get(userId) ?? null,
        userId,
      ),
    },
    { status: 201 },
  );
}
