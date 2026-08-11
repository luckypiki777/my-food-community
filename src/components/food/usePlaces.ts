"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 맛집 데이터를 BFF에서 가져오고 저장한다.
 *
 * CLAUDE.md 규약대로 브라우저는 Supabase를 직접 부르지 않는다.
 * 사진 업로드도 `/api/places` 가 대신 하고, 여기서는 공개 URL만 받아 쓴다.
 */

export type PlaceAuthor = {
  userId: string;
  nickname: string;
  imageUrl: string | null;
};

export type PlaceImage = {
  id: string;
  /** 테이블에 저장된 스토리지 경로. 화면에서 직접 쓸 일은 없다. */
  path: string;
  /** 바로 `<img src>` 에 넣을 수 있는 공개 URL. */
  url: string;
};

/**
 * 저장된 지도 정보. 네 값이 한 덩어리다 — 하나만 바뀌면 화면에 보이는 주소와
 * 지도에 찍히는 핀이 서로 다른 곳을 가리킨다. 서버도 DB 도 넷을 함께 받는다.
 *
 * 장소 선택 화면이 다루는 `PlaceLocation`(placeSearch.ts)과 다르다. 그쪽은 아직 고르는
 * 중이라 주소·좌표가 비어 있을 수 있는 후보고, 이쪽은 이미 다 채워진 결과다.
 */
export type MapLocation = {
  /** 지번 주소. */
  address: string;
  /** 장소명(상호). 글 제목(title)과 다를 수 있다. */
  name: string;
  lat: number;
  lng: number;
};

type PlaceBase = MapLocation & {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author: PlaceAuthor | null;
  /** 내가 쓴 글인지. 수정 버튼 노출에 쓴다. 판단은 서버가 한다. */
  isMine: boolean;
};

export type PlaceSummary = PlaceBase & {
  thumbnailUrl: string | null;
  imageCount: number;
};

export type PlaceDetail = PlaceBase & {
  images: PlaceImage[];
};

export type LoadStatus = "loading" | "ready" | "error";

export type PlaceSaveInput = {
  title: string;
  content: string;
  /** 지도에서 고른 위치. 등록·수정 모두 필수다. 서버가 넷을 함께 검사한다. */
  location: MapLocation;
  /** 새로 올릴 사진. */
  files: File[];
  /** 수정에서 지울 기존 사진의 id. */
  removeImageIds?: string[];
};

export type PlaceSaveResult = { ok: true; place: PlaceDetail } | { ok: false; message: string };

type ErrorBody = { error?: { code?: string; message?: string } };

const FALLBACK_ERROR = "요청을 처리하지 못했어요. 다시 시도해 주세요.";
const NETWORK_ERROR = "네트워크 문제로 저장하지 못했어요.";

/** BFF 에러 규약(`{ error: { code, message } }`)에서 사용자에게 보여줄 문구를 꺼낸다. */
async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  return body?.error?.message ?? FALLBACK_ERROR;
}

function toFormData(input: PlaceSaveInput): FormData {
  // 파일이 섞이므로 JSON 이 아니라 FormData 로 보낸다.
  // Content-Type 은 브라우저가 boundary 까지 붙여 직접 정한다. 손대면 안 된다.
  const form = new FormData();
  form.set("title", input.title);
  form.set("content", input.content);
  // 지도 정보는 넷이 한 덩어리다. 수정에서도 함께 실어야 서버가 받아 준다.
  // 좌표는 String() 으로 넘긴다 — toFixed 로 자르면 지도에서 고른 지점과 미세하게 어긋난다.
  form.set("address", input.location.address);
  form.set("name", input.location.name);
  form.set("lat", String(input.location.lat));
  form.set("lng", String(input.location.lng));
  for (const file of input.files) form.append("images", file);
  for (const id of input.removeImageIds ?? []) form.append("remove_image_ids", id);
  return form;
}

async function save(url: string, method: "POST" | "PATCH", input: PlaceSaveInput) {
  try {
    const res = await fetch(url, { method, body: toFormData(input) });
    if (!res.ok) return { ok: false as const, message: await errorMessage(res) };
    const body = (await res.json()) as { place: PlaceDetail };
    return { ok: true as const, place: body.place };
  } catch {
    return { ok: false as const, message: NETWORK_ERROR };
  }
}

export function createPlace(input: PlaceSaveInput): Promise<PlaceSaveResult> {
  return save("/api/places", "POST", input);
}

export function updatePlace(id: number, input: PlaceSaveInput): Promise<PlaceSaveResult> {
  return save(`/api/places/${id}`, "PATCH", input);
}

export type PlaceDeleteResult = { ok: true } | { ok: false; message: string };

/**
 * 맛집 삭제. 서버에서는 소프트 삭제(`deleted_at` 기록)라 행과 사진은 남는다.
 * 화면 입장에서는 목록·상세 어디에도 다시 나오지 않으므로 삭제와 같다.
 */
export async function deletePlace(id: number): Promise<PlaceDeleteResult> {
  try {
    const res = await fetch(`/api/places/${id}`, { method: "DELETE" });
    // 성공은 204라 본문이 없다.
    if (res.status === 204) return { ok: true };
    return { ok: false, message: await errorMessage(res) };
  } catch {
    return { ok: false, message: "네트워크 문제로 삭제하지 못했어요." };
  }
}

type ListBody = { places: PlaceSummary[]; nextCursor: number | null };

function listUrl(mine: boolean, cursor: number | null): string {
  const params = new URLSearchParams();
  if (mine) params.set("mine", "1");
  if (cursor !== null) params.set("cursor", String(cursor));
  const query = params.toString();
  return `/api/places${query ? `?${query}` : ""}`;
}

/**
 * 맛집 목록.
 *
 * @param enabled 로그인 상태일 때만 부른다. 비로그인 상태에서 부르면 401만 쌓인다.
 * @param mine 내가 쓴 글만. 마이 화면이 쓴다. 걸러내기는 서버가 한다 —
 *   불러온 페이지만 필터링하면 뒷 페이지의 내 글이 빠진다.
 */
export function usePlaceList(enabled: boolean, mine = false) {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastEnabled, setLastEnabled] = useState(enabled);

  // 로그인/로그아웃 경계에서 값을 비운다. 이렇게 안 하면 로그아웃 직후
  // 다음 사용자에게 이전 사용자가 보던 목록이 한 프레임 보인다.
  // effect 가 아니라 렌더 중에 맞추는 이유: effect 로 하면 잘못된 값이 이미 한 번 그려진 뒤다.
  if (lastEnabled !== enabled) {
    setLastEnabled(enabled);
    setPlaces([]);
    setNextCursor(null);
    setStatus("loading");
  }

  useEffect(() => {
    if (!enabled) return;

    // 언마운트 후 setState 를 막는다. StrictMode 이중 실행에서도 안전하다.
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(listUrl(mine, null), { cache: "no-store" });
        if (!res.ok) throw new Error(`places responded ${res.status}`);
        const body = (await res.json()) as ListBody;
        if (cancelled) return;
        setPlaces(body.places);
        setNextCursor(body.nextCursor);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, mine, reloadKey]);

  /** 등록·수정 후 목록을 최신으로 되돌린다. 이미 그려진 목록은 그대로 두고 조용히 갈아끼운다. */
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const loadMore = useCallback(async () => {
    if (nextCursor === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(listUrl(mine, nextCursor), { cache: "no-store" });
      if (!res.ok) throw new Error(`places responded ${res.status}`);
      const body = (await res.json()) as ListBody;
      setPlaces((prev) => [...prev, ...body.places]);
      setNextCursor(body.nextCursor);
    } catch {
      // 더 불러오기 실패는 이미 보고 있는 목록을 건드리지 않는다. 버튼이 그대로 남아 다시 누를 수 있다.
    } finally {
      setLoadingMore(false);
    }
  }, [mine, nextCursor, loadingMore]);

  return {
    places,
    status,
    reload,
    loadMore,
    loadingMore,
    hasMore: nextCursor !== null,
  };
}

/** 맛집 상세. `id` 가 null 이면 아무것도 부르지 않는다. */
export function usePlaceDetail(id: number | null) {
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [lastId, setLastId] = useState(id);

  // 다른 맛집으로 넘어가는 순간 이전 맛집 내용을 비운다.
  // 렌더 중에 맞춰야 이전 글이 한 프레임 보이는 일이 없다.
  if (lastId !== id) {
    setLastId(id);
    setPlace(null);
    setStatus("loading");
  }

  useEffect(() => {
    if (id === null) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/places/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`place responded ${res.status}`);
        const body = (await res.json()) as { place: PlaceDetail };
        if (cancelled) return;
        setPlace(body.place);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { place, status };
}

/** "2026. 8. 6." 형태. 목록·상세의 작성일 표기에 쓴다. */
export function formatPlaceDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

/** "구로댁 · 2026년 8월 6일" — 카드와 상세가 같은 형식을 쓴다. */
export function placeMeta(place: PlaceSummary | PlaceDetail): string {
  const who = place.author?.nickname ?? "이웃";
  const when = formatPlaceDate(place.createdAt);
  return when ? `${who} · ${when}` : who;
}
