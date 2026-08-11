import type { NextRequest } from "next/server";

import { parseCoords, reverseGeocodeCoord } from "@/lib/bff/reverseGeocode";
import { ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type ReverseGeocodeResponse = {
  /** 지번 주소 한 줄. 그 좌표에 주소가 없으면 null(오류가 아니다). */
  address: string | null;
};

/**
 * 리버스 지오코딩 — 좌표의 지번 주소를 읽어 준다.
 *
 * `?lat=&lng=` 을 받는다. 장소 선택 화면에서 지도가 멈출 때(`idle`)마다 부른다.
 *
 * 로그인 게이트를 두는 이유는 `/api/places/search` 와 같다. 유료 호출이고, 열어 두면
 * 우리 키로 남의 좌표를 대신 풀어 주는 꼴이 된다. 이 화면은 어차피 맛집을 등록하려는
 * 사람만 들어온다.
 * (지도 SDK 키를 내려주는 `/api/map/config` 만 게이트가 없다 — 그 값은 어차피 스크립트
 *  URL 에 실려 브라우저까지 나가는 값이라 성격이 다르다.)
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return unauthorized();

  const params = request.nextUrl.searchParams;
  const coords = parseCoords(params.get("lat"), params.get("lng"));
  if (!coords.ok) return coords.response;

  const found = await reverseGeocodeCoord(coords.value);
  if (!found.ok) return found.response;

  return ok<ReverseGeocodeResponse>({ address: found.address });
}
