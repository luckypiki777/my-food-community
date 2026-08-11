import "server-only";

import { badRequest, fail } from "@/lib/bff/response";

/**
 * 네이버 리버스 지오코딩 (NCP Maps).
 *
 * 좌표 → 지번 주소. 장소 선택 화면에서 지도를 끌 때마다 가운데 핀이 문 좌표를 여기로 보낸다.
 *
 * 지도 SDK 와 달리 이건 REST API 라 서버에서 부를 수 있다 — CLAUDE.md 규약대로
 * 서버에서 부를 수 있는 건 서버에서 부른다. 게다가 이 API 는 Key ID 와 **Key(시크릿)** 를
 * 같이 요구해서 애초에 브라우저로 내보낼 수 있는 종류가 아니다.
 *
 * 문서: https://api.ncloud-docs.com/docs/application-maps-reversegeocoding
 */

/** 지도 SDK(`oapi.map.naver.com`)와 다른 호스트다. 예전 `naveropenapi.apigw.ntruss.com` 도 아니다. */
const ENDPOINT = "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc";

/** 네이버가 이만큼 안에 답하지 않으면 포기한다. 화면이 "주소를 확인하는 중" 에 갇히면 안 된다. */
const TIMEOUT_MS = 5000;

/** 위도·경도의 유효 범위. */
const MAX_LAT = 90;
const MAX_LNG = 180;

/**
 * 좌표를 보낼 때의 소수점 자리.
 *
 * 7자리면 약 1cm 다. 지도 중심은 픽셀 반올림 때문에 마지막 자리가 계속 흔들리는데,
 * 그 흔들림까지 그대로 실어 보내면 같은 지점인데도 매번 다른 URL 이 된다.
 */
const COORD_PRECISION = 7;

/**
 * 결과 중 우리가 읽는 부분만 추린 모양.
 *
 * 네이버는 조각을 빈 문자열로 채워 보내는 곳이 많아서 전부 optional 로 두고 방어적으로 읽는다.
 */
type ReverseGeocodeBody = {
  status?: { code?: number; name?: string; message?: string };
  results?: Array<{
    name?: string;
    region?: Partial<Record<AreaKey, { name?: string }>>;
    land?: { type?: string; number1?: string; number2?: string };
  }>;
};

type AreaKey = "area1" | "area2" | "area3" | "area4";

/**
 * 주소를 이루는 행정구역 조각. `area0` 은 국가("kr")라 쓰지 않는다.
 *
 * area1 시·도 / area2 시·군·구 / area3 읍·면·동 / area4 리.
 * 도시에서는 area4 가 빈 문자열로 온다 — 그래서 빈 조각을 걸러낸 뒤에 잇는다.
 */
const AREA_KEYS: AreaKey[] = ["area1", "area2", "area3", "area4"];

/** 응답 status.code. 0/3 만 HTTP 200 으로 온다. */
const STATUS_OK = 0;
const STATUS_NO_RESULTS = 3;

const FAILED_MESSAGE = "주소를 읽지 못했어요.";

export type ReverseGeocodeOutcome =
  /** `address` 가 null 인 건 실패가 아니라 **그 좌표에 지번 주소가 없다**는 뜻이다(바다 위 등). */
  | { ok: true; address: string | null }
  | { ok: false; response: Response };

export type Coord = { lat: number; lng: number };

/**
 * 쿼리스트링 → 좌표.
 *
 * 숫자가 아니거나 범위를 벗어난 값으로 네이버를 부르면 어차피 100(invalid request)만 받는다.
 * 그 왕복을 여기서 막는다.
 */
export function parseCoords(
  latRaw: string | null,
  lngRaw: string | null,
): { ok: true; value: Coord } | { ok: false; response: Response } {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  // Number("") 는 0 이라 빈 값이 좌표 0,0 으로 통과해 버린다. 빈 값부터 막는다.
  if (latRaw === null || lngRaw === null || latRaw.trim() === "" || lngRaw.trim() === "") {
    return { ok: false, response: badRequest("좌표가 필요합니다.", "coords_required") };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, response: badRequest("좌표가 올바르지 않습니다.", "invalid_coords") };
  }
  if (Math.abs(lat) > MAX_LAT || Math.abs(lng) > MAX_LNG) {
    return { ok: false, response: badRequest("좌표가 올바르지 않습니다.", "invalid_coords") };
  }

  return { ok: true, value: { lat, lng } };
}

/**
 * 좌표 → 지번 주소 한 줄.
 *
 * 실패는 전부 BFF 응답 규약(`{ error: { code, message } }`)으로 바꿔서 돌려준다.
 * 네이버가 준 원문 에러는 서버 로그에만 남긴다.
 */
export async function reverseGeocodeCoord(coord: Coord): Promise<ReverseGeocodeOutcome> {
  // Key ID 는 지도 SDK 가 쓰는 값과 같다(같은 NCP Maps 애플리케이션이다).
  // REST 호출에만 Key(시크릿)가 하나 더 필요하다.
  const keyId = process.env.NAVER_MAP_CLIENT_ID;
  const key = process.env.NAVER_MAP_CLIENT_SECRET;

  // 키가 없다고 앱이 죽을 이유는 없다. 지도·검색과 같은 태도로, 주소 자리만 비운다.
  if (!keyId || !key) {
    console.error(
      "[bff:map/reverse-geocode] NAVER_MAP_CLIENT_ID / NAVER_MAP_CLIENT_SECRET 가 없습니다. .env.local 을 확인하세요.",
    );
    return {
      ok: false,
      response: fail(503, "reverse_geocode_unavailable", "주소 조회가 아직 설정되지 않았어요."),
    };
  }

  const url = new URL(ENDPOINT);
  // 순서는 **경도,위도** 다. 위도를 앞에 넣으면 엉뚱한 곳(대개 바다)의 주소가 온다.
  url.searchParams.set(
    "coords",
    `${coord.lng.toFixed(COORD_PRECISION)},${coord.lat.toFixed(COORD_PRECISION)}`,
  );
  // 지번만 받는다. roadaddr 을 같이 받아 봐야 화면에 쓸 일이 없다.
  url.searchParams.set("orders", "addr");
  // 기본값이 **xml** 이다. 안 붙이면 XML 이 온다.
  url.searchParams.set("output", "json");
  // sourcecrs/targetcrs 는 기본값이 EPSG:4326(WGS84 위·경도)이라 그대로 둔다.

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": keyId,
        "x-ncp-apigw-api-key": key,
      },
      // 좌표는 매번 다르다. 프레임워크 캐시에 걸릴 이유가 없다.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[bff:map/reverse-geocode] fetch", error);
    return {
      ok: false,
      response: fail(504, "reverse_geocode_timeout", "주소 조회가 응답하지 않아요."),
    };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[bff:map/reverse-geocode] naver responded ${res.status}`, detail);

    if (res.status === 429) {
      return {
        ok: false,
        response: fail(429, "reverse_geocode_rate_limited", "주소 조회 요청이 많아요. 잠시 후 다시 시도해 주세요."),
      };
    }
    // 401/403(키·권한 — NCP 콘솔에서 Reverse Geocoding 을 안 켰을 때 포함) 은 사용자가
    // 손쓸 수 없는 설정 문제다. 이유는 로그에만 남긴다.
    return { ok: false, response: fail(502, "reverse_geocode_failed", FAILED_MESSAGE) };
  }

  let body: ReverseGeocodeBody;
  try {
    body = (await res.json()) as ReverseGeocodeBody;
  } catch (error) {
    console.error("[bff:map/reverse-geocode] json", error);
    return { ok: false, response: fail(502, "reverse_geocode_failed", FAILED_MESSAGE) };
  }

  const code = body.status?.code;

  // 3 = no results. 바다 한가운데처럼 주소가 없는 좌표다. 오류가 아니라 정상적인 답이다.
  if (code === STATUS_NO_RESULTS) return { ok: true, address: null };

  if (code !== STATUS_OK) {
    console.error("[bff:map/reverse-geocode] status", body.status);
    return { ok: false, response: fail(502, "reverse_geocode_failed", FAILED_MESSAGE) };
  }

  // orders 에 넣은 종류대로 결과가 배열로 온다. 지번(addr)만 부탁했지만 이름으로 골라 둔다.
  const result = (body.results ?? []).find((item) => item.name === "addr") ?? body.results?.[0];
  return { ok: true, address: result ? formatJibunAddress(result) : null };
}

type ReverseGeocodeResult = NonNullable<ReverseGeocodeBody["results"]>[number];

/**
 * 분해되어 온 조각들을 사람이 읽는 지번 주소 한 줄로 잇는다.
 *
 * 네이버는 완성된 주소 문자열을 주지 않는다. 행정구역(area1~area4)과 번지(land)가 따로 오고,
 * 없는 조각은 빈 문자열로 채워져 온다. 그래서 **빈 조각을 걸러낸 뒤** 공백 하나로 잇는다 —
 * 그냥 이으면 "서울특별시 구로구 구로동  123-45" 처럼 공백이 겹친다.
 *
 * 예: 전라남도 + 광양시 + 광양읍 + 읍내리 + 252-1
 */
function formatJibunAddress(result: ReverseGeocodeResult): string | null {
  const parts = AREA_KEYS.map((key) => result.region?.[key]?.name?.trim() ?? "").filter(
    (name) => name !== "",
  );

  const lot = formatLotNumber(result.land);
  if (lot !== null) parts.push(lot);

  const text = parts.join(" ");
  return text === "" ? null : text;
}

/**
 * 번지수. `number1` 이 본번, `number2` 가 부번이다.
 *
 * 부번이 없는 땅은 `number2` 가 빈 문자열(혹은 "0")로 온다. 그대로 이으면 "123-" 이나
 * "123-0" 이 되므로 본번만 쓴다.
 */
function formatLotNumber(land: ReverseGeocodeResult["land"]): string | null {
  const main = land?.number1?.trim() ?? "";
  if (main === "" || main === "0") return null;

  const sub = land?.number2?.trim() ?? "";
  const lot = sub === "" || sub === "0" ? main : `${main}-${sub}`;

  // type 은 토지 종류다: "1" 일반 토지, "2" 산.
  // 산은 같은 번지의 일반 토지와 다른 땅이라 "산" 을 붙여야 주소가 구분된다.
  return land?.type === "2" ? `산 ${lot}` : lot;
}
