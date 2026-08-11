import "server-only";

import { badRequest, fail, fromSupabaseError } from "@/lib/bff/response";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import {
  MAX_IMAGE_BYTES,
  PLACE_IMAGE_BUCKET,
  buildOwnedImagePath,
  imageExtension,
  placeImageUrl,
  profileImageUrl,
} from "@/lib/supabase/storage";

/**
 * 맛집 라우트가 공유하는 검증 · 응답 조립 · 사진 업로드.
 *
 * CLAUDE.md 의 "BFF는 얇게 유지한다" 를 지키려고 route.ts 에는 흐름만 남기고
 * 반복되는 판단은 전부 여기로 모았다.
 */

/** DB 의 place_title_length / place_content_length 체크 제약과 같은 값이다. 한쪽만 바꾸면 안 된다. */
export const TITLE_MIN = 1;
export const TITLE_MAX = 100;
export const CONTENT_MIN = 10;
export const CONTENT_MAX = 2000;

/** place_address_length / place_name_length 체크 제약과 같은 값이다. */
export const ADDRESS_MIN = 1;
export const ADDRESS_MAX = 200;
export const NAME_MIN = 1;
export const NAME_MAX = 100;

/** 사진은 최소 1장. 수정 후에도 이 조건은 유지되어야 한다. */
export const MIN_PLACE_IMAGES = 1;
export const MAX_PLACE_IMAGES = 10;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/** 테이블에서 화면이 쓰는 컬럼만 고른다. */
export const PLACE_COLUMNS =
  "id, title, content, address, name, lat, lng, created_at, user_id" as const;
export const PLACE_IMAGE_COLUMNS = "id, image_path, sort_order" as const;

export type PlaceRow = {
  id: number;
  title: string;
  content: string;
  address: string;
  name: string;
  lat: number;
  lng: number;
  created_at: string;
  user_id: string;
};

export type PlaceImageRow = {
  id: string;
  image_path: string;
  sort_order: number;
};

export type PlaceAuthor = {
  userId: string;
  nickname: string;
  imageUrl: string | null;
};

export type PlaceImage = {
  id: string;
  /** 테이블에 저장된 값. `<user_id>/<uuidv4>.<ext>` */
  path: string;
  /** `SUPABASE_STORAGE_URL` 과 조립한 공개 URL. */
  url: string;
};

/**
 * 지도에서 고른 위치. 네 값은 한 덩어리라 넷이 같이 오거나 하나도 안 온다.
 *
 * 셋 중 하나만 바뀌면 화면에 보이는 주소와 지도가 문 좌표가 서로 다른 곳을 가리키게 된다.
 * DB 도 같은 규칙을 걸어 뒀다(name/lat/lng NOT NULL).
 */
export type PlaceLocationInput = {
  /** 지번 주소. */
  address: string;
  /** 장소명(상호). 글 제목(title)과 다를 수 있다. */
  name: string;
  lat: number;
  lng: number;
};

type PlaceBase = PlaceLocationInput & {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  /** 프로필이 아직 없는 작성자면 null. */
  author: PlaceAuthor | null;
  /** 수정 버튼을 보일지 화면이 바로 판단할 수 있게 미리 계산해서 준다. */
  isMine: boolean;
};

/** 목록용. 카드가 쓰는 대표 사진 한 장과 총 장수만 담는다. */
export type PlaceSummary = PlaceBase & {
  thumbnailUrl: string | null;
  imageCount: number;
};

/** 상세용. 갤러리를 위해 사진 전체를 순서대로 담는다. */
export type PlaceDetail = PlaceBase & {
  images: PlaceImage[];
};

/**
 * 검증 결과. 실패하면 그대로 반환할 수 있는 Response 를 들고 있다.
 * 라우트에서는 `if (!parsed.ok) return parsed.response;` 한 줄로 끝난다.
 */
export type Parsed<T> = { ok: true; value: T } | { ok: false; response: Response };

function invalid(response: Response): Parsed<never> {
  return { ok: false, response };
}

export function notFoundPlace(): Response {
  return fail(404, "not_found", "맛집을 찾을 수 없습니다.");
}

export function forbiddenPlace(): Response {
  return fail(403, "forbidden", "내가 등록한 맛집만 수정할 수 있습니다.");
}

/** 경로 파라미터의 id. `Place.id` 가 bigint identity 라 양의 정수만 유효하다. */
export function parsePlaceId(raw: string): Parsed<number> {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return invalid(badRequest("맛집 id 가 올바르지 않습니다.", "invalid_place_id"));
  }
  return { ok: true, value };
}

export function parseTitle(raw: FormDataEntryValue | null): Parsed<string> {
  if (typeof raw !== "string") {
    return invalid(badRequest("제목을 입력해 주세요.", "title_required"));
  }
  const value = raw.trim();
  if (value.length < TITLE_MIN) {
    return invalid(badRequest("제목을 입력해 주세요.", "title_required"));
  }
  if (value.length > TITLE_MAX) {
    return invalid(badRequest(`제목은 ${TITLE_MAX}자 이하로 입력해 주세요.`, "title_too_long"));
  }
  return { ok: true, value };
}

export function parseContent(raw: FormDataEntryValue | null): Parsed<string> {
  if (typeof raw !== "string") {
    return invalid(badRequest("내용을 입력해 주세요.", "content_required"));
  }
  const value = raw.trim();
  if (value.length === 0) {
    return invalid(badRequest("내용을 입력해 주세요.", "content_required"));
  }
  // 공백만 잔뜩 넣어 10자를 채우는 걸 막으려고 trim 후에 센다. DB 제약도 btrim 기준이다.
  if (value.length < CONTENT_MIN) {
    return invalid(
      badRequest(`내용은 ${CONTENT_MIN}자 이상 입력해 주세요.`, "content_too_short"),
    );
  }
  if (value.length > CONTENT_MAX) {
    return invalid(badRequest(`내용은 ${CONTENT_MAX}자 이하로 입력해 주세요.`, "content_too_long"));
  }
  return { ok: true, value };
}

/** 지도 정보를 이루는 폼 필드. 이 넷은 언제나 함께 움직인다. */
const LOCATION_FIELDS = ["address", "name", "lat", "lng"] as const;

function parseAddress(raw: FormDataEntryValue | null): Parsed<string> {
  if (typeof raw !== "string") {
    return invalid(badRequest("주소를 선택해 주세요.", "address_required"));
  }
  const value = raw.trim();
  if (value.length < ADDRESS_MIN) {
    return invalid(badRequest("주소를 선택해 주세요.", "address_required"));
  }
  if (value.length > ADDRESS_MAX) {
    return invalid(badRequest(`주소는 ${ADDRESS_MAX}자 이하여야 합니다.`, "address_too_long"));
  }
  return { ok: true, value };
}

function parsePlaceName(raw: FormDataEntryValue | null): Parsed<string> {
  if (typeof raw !== "string") {
    return invalid(badRequest("장소를 선택해 주세요.", "name_required"));
  }
  const value = raw.trim();
  if (value.length < NAME_MIN) {
    return invalid(badRequest("장소를 선택해 주세요.", "name_required"));
  }
  if (value.length > NAME_MAX) {
    return invalid(badRequest(`장소명은 ${NAME_MAX}자 이하여야 합니다.`, "name_too_long"));
  }
  return { ok: true, value };
}

/** 위도 -90~90 · 경도 -180~180. DB 의 place_lat_range / place_lng_range 와 같은 값이다. */
const COORDINATE_LIMIT = {
  lat: { min: -90, max: 90, label: "위도" },
  lng: { min: -180, max: 180, label: "경도" },
} as const;

function parseCoordinate(
  raw: FormDataEntryValue | null,
  axis: keyof typeof COORDINATE_LIMIT,
): Parsed<number> {
  const limit = COORDINATE_LIMIT[axis];
  const required = () => invalid(badRequest("지도에서 위치를 선택해 주세요.", `${axis}_required`));

  if (typeof raw !== "string") return required();

  const text = raw.trim();
  // Number("") 도 Number(" ") 도 0 이다. 먼저 끊지 않으면 빈 값이 적도 한복판(0, 0)으로 저장된다.
  if (text === "") return required();

  const value = Number(text);
  // NaN 과 Infinity 를 한 번에 거른다. 둘 다 DB 로 넘기면 안 되는 값이다.
  if (!Number.isFinite(value)) {
    return invalid(badRequest(`${limit.label}가 올바르지 않습니다.`, `invalid_${axis}`));
  }
  if (value < limit.min || value > limit.max) {
    return invalid(
      badRequest(
        `${limit.label}는 ${limit.min} ~ ${limit.max} 사이여야 합니다.`,
        `invalid_${axis}`,
      ),
    );
  }
  return { ok: true, value };
}

/** 지도 정보. 등록에서는 넷 다 필수다. */
export function parseLocation(form: FormData): Parsed<PlaceLocationInput> {
  const address = parseAddress(form.get("address"));
  if (!address.ok) return address;

  const name = parsePlaceName(form.get("name"));
  if (!name.ok) return name;

  const lat = parseCoordinate(form.get("lat"), "lat");
  if (!lat.ok) return lat;

  const lng = parseCoordinate(form.get("lng"), "lng");
  if (!lng.ok) return lng;

  return {
    ok: true,
    value: { address: address.value, name: name.value, lat: lat.value, lng: lng.value },
  };
}

/**
 * 수정에서의 지도 정보. 안 보내면 그대로 두고, 보내면 넷 다 보내야 한다.
 *
 * 일부만 받아 주면 주소만 바꾸고 좌표는 두는 식이 가능해져서, 화면에 보이는 주소와
 * 지도에 찍히는 핀이 다른 곳을 가리키게 된다. 그럴 바에는 400 으로 끊는 게 낫다.
 */
export function parseOptionalLocation(form: FormData): Parsed<PlaceLocationInput | null> {
  const present = LOCATION_FIELDS.filter((field) => form.has(field));
  if (present.length === 0) return { ok: true, value: null };
  if (present.length < LOCATION_FIELDS.length) {
    return invalid(
      badRequest(
        "지도 정보는 주소 · 장소명 · 좌표를 함께 보내야 합니다.",
        "location_incomplete",
      ),
    );
  }
  return parseLocation(form);
}

export function parsePageSize(raw: string | null): Parsed<number> {
  if (raw === null || raw === "") return { ok: true, value: DEFAULT_PAGE_SIZE };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_PAGE_SIZE) {
    return invalid(badRequest(`limit 은 1~${MAX_PAGE_SIZE} 사이여야 합니다.`, "invalid_limit"));
  }
  return { ok: true, value };
}

/** 키셋 페이지네이션 커서. 직전 페이지의 마지막 id 다. */
export function parseCursor(raw: string | null): Parsed<number | null> {
  if (raw === null || raw === "") return { ok: true, value: null };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return invalid(badRequest("cursor 가 올바르지 않습니다.", "invalid_cursor"));
  }
  return { ok: true, value };
}

/**
 * 폼에 실린 사진 파일을 모은다. 장수 제한은 호출하는 쪽에서 판단한다.
 * 등록은 "1장 이상", 수정은 "지우고 더한 뒤에도 1장 이상" 이라 기준이 다르기 때문이다.
 */
export function collectImageFiles(form: FormData, field = "images"): Parsed<File[]> {
  const files: File[] = [];

  for (const entry of form.getAll(field)) {
    if (!(entry instanceof File)) {
      return invalid(badRequest("이미지 형식이 올바르지 않습니다.", "invalid_image"));
    }
    // 파일을 고르지 않은 <input type="file"> 은 빈 File 로 실려온다. 없는 것으로 본다.
    if (entry.size === 0 && entry.name === "") continue;

    if (entry.size === 0) {
      return invalid(badRequest("빈 파일입니다.", "empty_file"));
    }
    if (entry.size > MAX_IMAGE_BYTES) {
      return invalid(
        badRequest(
          `사진은 ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하만 올릴 수 있습니다.`,
          "image_too_large",
        ),
      );
    }
    // 확장자는 파일명이 아니라 MIME 에서 뽑는다. 버킷에도 같은 제한이 걸려 있다.
    if (!imageExtension(entry.type)) {
      return invalid(
        badRequest("JPG · PNG · WebP · GIF 만 올릴 수 있습니다.", "unsupported_image_type"),
      );
    }
    files.push(entry);
  }

  return { ok: true, value: files };
}

/**
 * 사진을 버킷에 올리고 저장된 경로를 순서대로 돌려준다.
 *
 * 한 장이라도 실패하면 그 요청은 통째로 실패다. 이미 올라간 파일은
 * 아무 행도 참조하지 않는 고아가 되므로 여기서 즉시 지운다.
 */
export async function uploadPlaceImages(
  supabase: SupabaseServerClient,
  userId: string,
  files: File[],
): Promise<Parsed<string[]>> {
  const prepared: { file: File; path: string }[] = [];
  for (const file of files) {
    const extension = imageExtension(file.type);
    if (!extension) {
      return invalid(
        badRequest("JPG · PNG · WebP · GIF 만 올릴 수 있습니다.", "unsupported_image_type"),
      );
    }
    prepared.push({ file, path: buildOwnedImagePath(userId, extension) });
  }

  const results = await Promise.all(
    prepared.map(async ({ file, path }) => {
      const { error } = await supabase.storage
        .from(PLACE_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      return { path, error };
    }),
  );

  const failed = results.filter((result) => result.error !== null);
  if (failed.length > 0) {
    console.error("[bff:places] upload", failed[0].error);
    await removePlaceImageObjects(
      supabase,
      results.filter((result) => result.error === null).map((result) => result.path),
    );
    return invalid(fail(502, "upload_failed", "사진을 업로드하지 못했습니다."));
  }

  return { ok: true, value: prepared.map(({ path }) => path) };
}

/**
 * 버킷에서 파일을 지운다.
 *
 * 여기서 실패해도 요청 자체를 되돌리지는 않는다. 남는 건 아무도 참조하지 않는 파일이라
 * 사용자에게 보이는 문제가 없고, 실패를 이유로 DB 를 되돌리면 오히려 상태가 더 어긋난다.
 */
export async function removePlaceImageObjects(
  supabase: SupabaseServerClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PLACE_IMAGE_BUCKET).remove(paths);
  if (error) {
    console.warn("[bff:places] 사진 파일 정리 실패", { paths, error });
  }
}

/**
 * 작성자 프로필을 한 번에 모아 온다.
 *
 * `Place.user_id` 와 `profile.user_id` 는 둘 다 auth.users 를 보고 있을 뿐
 * 서로 FK 로 이어져 있지 않아서 PostgREST 임베드가 되지 않는다.
 * 행마다 조회하면 N+1 이 되므로 id 를 모아 한 번에 읽는다.
 */
export async function fetchAuthors(
  supabase: SupabaseServerClient,
  userIds: string[],
): Promise<Map<string, PlaceAuthor>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profile")
    .select("user_id, nickname, image_path")
    .in("user_id", unique);

  if (error) {
    // 작성자 표시는 부가 정보다. 여기서 실패했다고 목록까지 막지는 않는다.
    console.warn("[bff:places] 작성자 조회 실패", error);
    return new Map();
  }

  return new Map(
    data.map((row) => [
      row.user_id,
      { userId: row.user_id, nickname: row.nickname, imageUrl: profileImageUrl(row.image_path) },
    ]),
  );
}

/**
 * 살아 있는 맛집 + 사진을 고르는 기본 조회.
 *
 * 소프트 삭제(`deleted_at`)는 읽기 한 군데만 빠뜨려도 지운 글이 그대로 새어나간다.
 * 목록·상세·수정 전 조회가 전부 이 함수를 거치게 해서 필터를 잊을 수 없게 만든다.
 *
 * 사진 행과 스토리지 파일은 건드리지 않는다. 소프트 삭제는 되돌릴 수 있어야 하고,
 * 파일까지 지우면 되돌릴 게 남지 않는다.
 */
export function selectActivePlaces(supabase: SupabaseServerClient) {
  return supabase
    .from("place")
    .select(`${PLACE_COLUMNS}, place_image(${PLACE_IMAGE_COLUMNS})`)
    .is("deleted_at", null);
}

export type PlaceCreateInput = {
  title: string;
  content: string;
  location: PlaceLocationInput;
  files: File[];
};

/**
 * 글 + 사진을 한 벌로 만든다. 등록 라우트와 시드 라우트가 이 순서를 공유한다.
 *
 * PostgREST 호출은 한 트랜잭션으로 묶이지 않으므로 순서와 되돌리기가 전부다.
 *  1) 글 — place_image 의 INSERT 정책이 "이 place 의 주인인가" 를 보기 때문에 먼저 있어야 한다.
 *  2) 업로드 → 3) 사진 행. 둘 중 하나라도 실패하면 올린 파일과 글을 되돌린다.
 *     사진 없는 맛집을 남기지 않기 위해서다.
 */
export async function insertPlaceWithImages(
  supabase: SupabaseServerClient,
  userId: string,
  input: PlaceCreateInput,
): Promise<Parsed<{ row: PlaceRow; images: PlaceImageRow[] }>> {
  const created = await supabase
    .from("place")
    .insert({
      title: input.title,
      content: input.content,
      address: input.location.address,
      name: input.location.name,
      lat: input.location.lat,
      lng: input.location.lng,
      user_id: userId,
    })
    .select(PLACE_COLUMNS)
    .single();

  if (created.error) return invalid(fromSupabaseError(created.error, "places:insert"));

  const uploaded = await uploadPlaceImages(supabase, userId, input.files);
  if (!uploaded.ok) {
    // FK 가 cascade 라 사진 행이 있었다면 함께 정리된다.
    await supabase.from("place").delete().eq("id", created.data.id);
    return uploaded;
  }

  const images = await supabase
    .from("place_image")
    .insert(
      uploaded.value.map((path, index) => ({
        place_id: created.data.id,
        image_path: path,
        sort_order: index,
      })),
    )
    .select(PLACE_IMAGE_COLUMNS);

  if (images.error) {
    await removePlaceImageObjects(supabase, uploaded.value);
    await supabase.from("place").delete().eq("id", created.data.id);
    return invalid(fromSupabaseError(images.error, "places:images"));
  }

  return { ok: true, value: { row: created.data, images: images.data } };
}

/** 임베드로 딸려온 사진은 순서가 보장되지 않는다. 항상 sort_order 로 세운다. */
export function sortImages(rows: PlaceImageRow[]): PlaceImageRow[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

export function toPlaceImage(row: PlaceImageRow): PlaceImage {
  return { id: row.id, path: row.image_path, url: placeImageUrl(row.image_path) };
}

function toPlaceBase(row: PlaceRow, author: PlaceAuthor | null, viewerId: string): PlaceBase {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    address: row.address,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    author,
    isMine: row.user_id === viewerId,
  };
}

export function toPlaceSummary(
  row: PlaceRow,
  images: PlaceImageRow[],
  author: PlaceAuthor | null,
  viewerId: string,
): PlaceSummary {
  const sorted = sortImages(images);
  return {
    ...toPlaceBase(row, author, viewerId),
    thumbnailUrl: sorted.length > 0 ? placeImageUrl(sorted[0].image_path) : null,
    imageCount: sorted.length,
  };
}

export function toPlaceDetail(
  row: PlaceRow,
  images: PlaceImageRow[],
  author: PlaceAuthor | null,
  viewerId: string,
): PlaceDetail {
  return {
    ...toPlaceBase(row, author, viewerId),
    images: sortImages(images).map(toPlaceImage),
  };
}
