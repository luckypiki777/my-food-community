import type { NextRequest } from "next/server";

import { parseSearchQuery, searchLocalPlaces, type PlaceSearchItem } from "@/lib/bff/placeSearch";
import { ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export type PlaceSearchResponse = { places: PlaceSearchItem[] };

/**
 * 장소 검색 — 네이버 지역 검색을 대신 불러 준다.
 *
 * `?query=` 하나만 받는다. 결과가 없으면 빈 배열이다(404 가 아니다) — 화면은 그때
 * "직접 입력" 안내로 넘어가고, 그건 오류가 아니라 정상적인 갈림길이다.
 *
 * 로그인 게이트를 두는 이유: 이 검색은 맛집을 등록하려는 사람만 쓰고, 네이버 호출은
 * 하루 25,000건으로 묶여 있다. 열어 두면 우리 키로 남의 검색을 대신 쳐주는 꼴이 된다.
 * (지도 키를 내려주는 `/api/map/config` 는 어차피 스크립트 URL 에 실려 나가는 값이라
 *  게이트가 없다. 여기는 Client Secret 을 쓰는 호출이라 성격이 다르다.)
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return unauthorized();

  const query = parseSearchQuery(request.nextUrl.searchParams.get("query"));
  if (!query.ok) return query.response;

  const found = await searchLocalPlaces(query.value);
  if (!found.ok) return found.response;

  return ok<PlaceSearchResponse>({ places: found.items });
}
