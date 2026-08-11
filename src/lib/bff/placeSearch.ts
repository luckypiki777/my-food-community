import "server-only";

import { badRequest, fail } from "@/lib/bff/response";

/**
 * 네이버 지역 검색 (NAVER API Hub).
 *
 * 지도 SDK 와 달리 이건 서버에서 부를 수 있으므로 서버에서 부른다 — CLAUDE.md 의
 * "브라우저는 자체 API 만 호출한다" 규약 그대로다. Client Secret 이 있는 API 라
 * 애초에 브라우저로 내보낼 수 있는 종류도 아니다.
 *
 * 문서: https://api.ncloud-docs.com/docs/naver-api-hub-search-local
 */

/** API Hub 게이트웨이. 예전 openapi.naver.com/v1/search/local 주소가 아니다. */
const ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/local";

/**
 * 한 번에 받을 수 있는 결과 수. **5가 API 의 상한이다**(문서상 display 는 1~5).
 * 페이지네이션을 붙일 수는 있지만, 가게 하나를 고르는 화면이라 5개면 충분하다.
 */
export const MAX_SEARCH_RESULTS = 5;

/** 검색어 길이 한도. 네이버가 거절하기 전에 우리가 먼저 막는다. */
export const MAX_QUERY_LENGTH = 100;

/** 네이버가 이만큼 안에 답하지 않으면 포기한다. 화면이 무한정 매달리면 안 된다. */
const TIMEOUT_MS = 5000;

/** 위도·경도의 유효 범위. 좌표 파싱이 이 밖으로 나가면 값을 버린다. */
const MAX_LAT = 90;
const MAX_LNG = 180;

export type PlaceSearchItem = {
  id: string;
  /** 업체명. 네이버가 붙여 보내는 `<b>` 태그를 떼어낸 값이다. */
  name: string;
  /** 지번 주소(`address`). 등록 화면의 주소 영역에 들어가는 값이다. */
  address: string | null;
  /** 도로명 주소(`roadAddress`). 지번이 비어 올 때 목록에서 대신 보여준다. */
  roadAddress: string | null;
  /** "한식>국밥" 같은 분류. 없으면 null. */
  category: string | null;
  /** `mapy` 를 도(度) 단위로 바꾼 값. */
  lat: number | null;
  /** `mapx` 를 도(度) 단위로 바꾼 값. */
  lng: number | null;
};

export type PlaceSearchOutcome =
  | { ok: true; items: PlaceSearchItem[] }
  | { ok: false; response: Response };

/** 네이버 응답에서 우리가 읽는 만큼만 추린 모양. 전부 optional 로 두고 방어적으로 읽는다. */
type LocalSearchBody = {
  items?: Array<{
    title?: string;
    link?: string;
    category?: string;
    description?: string;
    telephone?: string;
    address?: string;
    roadAddress?: string;
    mapx?: string;
    mapy?: string;
  }>;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

/**
 * 검색 결과의 텍스트를 화면에 그대로 넣을 수 있게 다듬는다.
 *
 * 네이버는 검색어와 겹치는 부분을 `<b>` 로 감싸서 보낸다("<b>구로</b> 국밥"). 우리는
 * 이 문자열을 그냥 텍스트로 그리므로 태그가 눈에 보이게 된다. 엔티티(`&amp;` 등)도
 * 같이 풀어야 "김밥천국 &amp; 분식" 같은 이름이 제대로 나온다.
 */
function plainText(raw: string | undefined): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&([a-zA-Z]+|#\d+);/g, (match, name: string) => ENTITIES[name] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

function orNull(raw: string | undefined): string | null {
  const text = plainText(raw);
  return text === "" ? null : text;
}

/**
 * `mapx`(경도) · `mapy`(위도) → 도(度) 단위 숫자.
 *
 * 문서에는 "WGS84" 라고만 적혀 있지만 실제로는 **도에 10^7 을 곱한 정수 문자열**로 온다
 * ("1269014070" = 126.9014070). 두 형태를 다 받아 준다 — 값이 각도 범위를 벗어나면
 * 10^7 로 나눈 것으로 본다. 나눈 뒤에도 범위 밖이면 못 믿을 값이라 버린다.
 */
function toDegrees(raw: string | undefined, limit: number): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const degrees = Math.abs(value) > limit ? value / 1e7 : value;
  return Math.abs(degrees) > limit ? null : degrees;
}

/**
 * 검색어 검증.
 *
 * 빈 검색어로 네이버를 부르면 SE01 만 받는다. 그 왕복을 여기서 막는다.
 */
export function parseSearchQuery(raw: string | null): { ok: true; value: string } | { ok: false; response: Response } {
  const query = (raw ?? "").trim();
  if (query === "") {
    return { ok: false, response: badRequest("검색어를 입력해 주세요.", "query_required") };
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return {
      ok: false,
      response: badRequest(`검색어는 ${MAX_QUERY_LENGTH}자까지 입력할 수 있습니다.`, "query_too_long"),
    };
  }
  return { ok: true, value: query };
}

/**
 * 지역 검색 호출.
 *
 * 실패는 전부 BFF 응답 규약(`{ error: { code, message } }`)으로 바꿔서 돌려준다.
 * 네이버가 준 원문 에러는 서버 로그에만 남긴다 — 사용자에게 SE99 를 보여줄 이유가 없다.
 */
export async function searchLocalPlaces(query: string): Promise<PlaceSearchOutcome> {
  const keyId = process.env.NAVER_SEARCH_CLIENT_ID;
  const key = process.env.NAVER_SEARCH_CLIENT_SECRET;

  // 키가 없다고 앱 전체가 죽을 이유는 없다. 지도 키와 같은 태도로, 검색 자리에만 안내를 띄운다.
  if (!keyId || !key) {
    console.error(
      "[bff:places/search] NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 가 없습니다. .env.local 을 확인하세요.",
    );
    return {
      ok: false,
      response: fail(503, "search_unavailable", "장소 검색이 아직 설정되지 않았어요."),
    };
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(MAX_SEARCH_RESULTS));
  // sort=random 이 "정확도순" 이다. comment(리뷰순)는 이름을 정확히 친 가게를 뒤로 민다.
  url.searchParams.set("sort", "random");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": key,
      },
      // 검색 결과는 사용자 입력에 따라 매번 다르다. 프레임워크 캐시에 걸리면 안 된다.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[bff:places/search] fetch", error);
    return {
      ok: false,
      response: fail(504, "search_timeout", "장소 검색이 응답하지 않아요. 잠시 후 다시 시도해 주세요."),
    };
  }

  if (!res.ok) {
    // 게이트웨이 에러 본문은 형태가 일정하지 않다. 진단용이니 텍스트 그대로 로그에 남긴다.
    const detail = await res.text().catch(() => "");
    console.error(`[bff:places/search] naver responded ${res.status}`, detail);

    if (res.status === 400) {
      return { ok: false, response: badRequest("검색어를 다시 입력해 주세요.", "invalid_query") };
    }
    if (res.status === 429) {
      return {
        ok: false,
        response: fail(429, "search_rate_limited", "장소 검색 요청이 많아요. 잠시 후 다시 시도해 주세요."),
      };
    }
    // 401/403(키·권한) 은 사용자가 손쓸 수 없는 설정 문제다. 이유는 로그에만 남긴다.
    return { ok: false, response: fail(502, "search_failed", "장소를 검색하지 못했어요.") };
  }

  let body: LocalSearchBody;
  try {
    body = (await res.json()) as LocalSearchBody;
  } catch (error) {
    console.error("[bff:places/search] json", error);
    return { ok: false, response: fail(502, "search_failed", "장소를 검색하지 못했어요.") };
  }

  const items = (body.items ?? [])
    .map((item, index) => toSearchItem(item, index))
    // 이름이 없는 결과는 고를 수가 없다.
    .filter((item): item is PlaceSearchItem => item !== null);

  return { ok: true, items };
}

function toSearchItem(item: NonNullable<LocalSearchBody["items"]>[number], index: number): PlaceSearchItem | null {
  const name = plainText(item.title);
  if (name === "") return null;

  const lat = toDegrees(item.mapy, MAX_LAT);
  const lng = toDegrees(item.mapx, MAX_LNG);

  return {
    // 네이버는 안정적인 식별자를 주지 않는다. 좌표가 있으면 그게 가장 그 가게다운 키다.
    id: lat !== null && lng !== null ? `naver:${lat},${lng}` : `naver:${index}:${name}`,
    name,
    address: orNull(item.address),
    roadAddress: orNull(item.roadAddress),
    category: orNull(item.category),
    lat,
    lng,
  };
}
