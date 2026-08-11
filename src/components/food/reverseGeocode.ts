"use client";

/**
 * 리버스 지오코딩 — 좌표의 지번 주소를 BFF(`/api/map/reverse-geocode`)를 통해 읽는다.
 *
 * 브라우저는 네이버를 직접 부르지 않는다. 리버스 지오코딩은 REST API 라 서버에서 부를 수
 * 있고, Key(시크릿)가 필요해서 브라우저에 둘 수도 없다.
 * (지도 SDK 만 `<script src>` 말고 방법이 없어서 예외다 — `naverMaps.ts` 참고.)
 *
 * 주소를 잇는 규칙(행정구역 + 번지)은 전부 서버에 있다. 화면은 완성된 한 줄만 받는다.
 */

import type { LatLngLiteral } from "./naverMaps";

type ReverseGeocodeBody = { address?: string | null };

/**
 * 좌표 → 지번 주소. 못 읽으면 null.
 *
 * 실패를 예외로 던지지 않는 이유: 주소를 못 읽어도 화면은 굴러가야 한다. 지도는 그대로
 * 보이고 주소 자리에만 안내가 뜬다 — 위치는 핀이 물고 있으니 등록을 막을 일도 아니다.
 *
 * 그 좌표에 주소가 없는 경우(바다 위 등)와 호출이 실패한 경우를 굳이 나누지 않는다.
 * 어느 쪽이든 사용자가 할 일은 같다 — 지도를 조금 움직이는 것.
 */
export async function reverseGeocode(coord: LatLngLiteral): Promise<string | null> {
  const query = new URLSearchParams({ lat: String(coord.lat), lng: String(coord.lng) });

  try {
    const res = await fetch(`/api/map/reverse-geocode?${query}`, { cache: "no-store" });
    if (!res.ok) return null;

    const body = (await res.json()) as ReverseGeocodeBody;
    const address = body.address?.trim() ?? "";
    return address === "" ? null : address;
  } catch {
    return null;
  }
}
