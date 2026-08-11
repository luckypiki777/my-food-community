"use client";

/**
 * 장소 검색 — 네이버 지역 검색을 BFF(`/api/places/search`)를 통해 부른다.
 *
 * 브라우저는 네이버를 직접 부르지 않는다. 지역 검색은 Client Secret 이 필요한 API 라
 * 애초에 브라우저에 둘 수 없고, CLAUDE.md 규약대로 서버에서 부를 수 있는 건 서버에서 부른다.
 * (지도 SDK 만 `<script src>` 말고 방법이 없어서 예외다.)
 *
 * 서버가 `mapx`/`mapy` 를 `lng`/`lat` 으로 바꿔서 내려주므로 화면은 좌표 변환을 모른다.
 */

export type PlaceLocation = {
  id: string;
  name: string;
  /** 지번 주소. 이름만 직접 입력한 경우 null. */
  address: string | null;
  /** 도로명 주소. 목록에서 지번이 비었을 때 대신 보여준다. */
  roadAddress: string | null;
  /** "한식>국밥" 같은 분류. 검색 결과에만 있다. */
  category: string | null;
  /** 지도 좌표. 이름만 직접 입력한 경우 null이라 지도를 옮길 수 없다. */
  lat: number | null;
  lng: number | null;
};

export type PlaceSearchResult =
  | { ok: true; places: PlaceLocation[] }
  | { ok: false; message: string };

const FALLBACK_ERROR = "장소를 검색하지 못했어요. 다시 시도해 주세요.";
const NETWORK_ERROR = "네트워크 문제로 검색하지 못했어요.";

type ErrorBody = { error?: { code?: string; message?: string } };

/**
 * 이름·주소로 장소를 찾는다.
 *
 * 실패를 예외로 던지지 않는 이유: 부르는 쪽이 화면이라 오류 문구를 그대로 보여줘야 한다.
 * 서버가 준 문구를 우선 쓴다 — 검색어가 너무 길다든지 하는 이유는 서버만 안다.
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult> {
  const q = query.trim();
  if (q === "") return { ok: true, places: [] };

  try {
    const res = await fetch(`/api/places/search?query=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ErrorBody | null;
      return { ok: false, message: body?.error?.message ?? FALLBACK_ERROR };
    }

    const body = (await res.json()) as { places: PlaceLocation[] };
    return { ok: true, places: body.places };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

/**
 * 주소 없이 이름만 정하는 경우.
 *
 * 검색 결과가 없을 때(07 화면) 쓴다. 좌표가 없으므로 지도는 그 자리에 그대로 있고,
 * 위치는 사용자가 지도를 끌어서 맞춘다.
 */
export function manualLocation(name: string): PlaceLocation {
  return {
    id: `manual:${name}`,
    name: name.trim(),
    address: null,
    roadAddress: null,
    category: null,
    lat: null,
    lng: null,
  };
}

/** 주소 칸에 보여줄 문구. 지번이 없으면 도로명, 그것도 없으면 이름을 대신 보여준다. */
export function locationLabel(location: PlaceLocation): string {
  return location.address ?? location.roadAddress ?? location.name;
}
