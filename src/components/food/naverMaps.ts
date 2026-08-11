"use client";

/**
 * 네이버 지도 JS API v3 로더.
 *
 * 지도 SDK 는 성격상 브라우저가 직접 받아야 한다 — `<script src>` 말고는 방법이 없다.
 * 대신 키는 번들에 박지 않고 `/api/map/config` 가 내려준다. 그래서 `NEXT_PUBLIC_` 없이도
 * 브라우저가 SDK 를 띄울 수 있고, 키를 바꿔도 다시 빌드하지 않아도 된다.
 *
 * SDK 는 처음 지도를 열 때 한 번만 받는다. 200KB 가 넘어서 앱을 켤 때마다 받으면
 * 지도를 안 보는 사람까지 값을 치른다.
 *
 * 여기는 **지도를 그리는 일만** 한다. 좌표 → 주소(리버스 지오코딩)는 SDK 의 geocoder
 * 서브모듈이 아니라 BFF 가 REST API 로 부른다 — `reverseGeocode.ts` 를 보라.
 */

/** 구로디지털단지역(2호선). 구로 맛집이니 지도는 늘 여기서 시작한다. */
export const GURO_DIGITAL_STATION: LatLngLiteral = { lat: 37.485264, lng: 126.901401 };

const SDK_SRC = "https://oapi.map.naver.com/openapi/v3/maps.js";

/**
 * 같은 지점으로 볼 오차(약 1cm).
 * 지도 중심은 픽셀 반올림 때문에 가만히 둬도 마지막 자리가 흔들린다.
 * 이 값이 없으면 "prop 반영 → idle → prop 반영" 이 서로를 깨우며 멈추지 않는다.
 */
const EPSILON = 1e-7;

export type LatLngLiteral = { lat: number; lng: number };

export function sameCoord(a: LatLngLiteral, b: LatLngLiteral): boolean {
  return Math.abs(a.lat - b.lat) < EPSILON && Math.abs(a.lng - b.lng) < EPSILON;
}

/** SDK 의 좌표 객체. 우리는 만들고 읽기만 한다. */
export interface NaverLatLng {
  lat(): number;
  lng(): number;
}

export interface NaverMapInstance {
  getCenter(): NaverLatLng;
  setCenter(coord: NaverLatLng): void;
  destroy(): void;
}

/**
 * 지도 위에 찍는 마커.
 *
 * 위치를 **고르는** 화면의 핀은 마커가 아니라 컨테이너 중앙에 고정된 DOM 이다(NaverMap.tsx).
 * 마커는 반대로 이미 정해진 좌표를 **보여줄 때** 쓴다 — 상세 화면의 미니 지도가 그렇다.
 */
export interface NaverMarkerInstance {
  setPosition(coord: NaverLatLng): void;
  /** null 을 넣으면 지도에서 떼어낸다. 마커를 지우는 방법이 이것뿐이다. */
  setMap(map: NaverMapInstance | null): void;
}

/** `Event.addListener` 가 돌려주는 핸들. 해제할 때 그대로 돌려주기만 한다. */
export type NaverEventHandle = object;

/**
 * 우리가 쓰는 만큼만 추린 SDK 타입.
 * `@types/navermaps` 를 넣지 않은 이유: 쓰는 면이 이 정도라 의존성 하나를 더 다는 값이 안 된다.
 */
export interface NaverMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMapInstance;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Marker: new (options: Record<string, unknown>) => NaverMarkerInstance;
  Position: Record<string, number>;
  Event: {
    addListener(target: object, eventName: string, handler: () => void): NaverEventHandle;
    removeListener(handle: NaverEventHandle): void;
  };
}

declare global {
  interface Window {
    naver?: { maps: NaverMapsApi };
    /** SDK 가 키·도메인 검증에 실패하면 부른다. 스크립트 로드가 끝난 뒤에 온다. */
    navermap_authFailure?: () => void;
  }
}

/** 지도를 못 띄운 이유. 화면이 이 값으로 안내 문구를 고른다. */
export type NaverMapsFailure = "no-key" | "auth" | "unavailable";

export type NaverMapsLoad =
  | { ok: true; maps: NaverMapsApi }
  | { ok: false; reason: NaverMapsFailure };

let pending: Promise<NaverMapsLoad> | null = null;
let authFailed = false;
const authListeners = new Set<() => void>();

/**
 * 인증 실패 알림.
 *
 * 인증은 스크립트 로드가 **성공한 뒤** 비동기로 깨진다(키가 틀렸거나 NCP 에 등록한
 * 웹 서비스 URL 과 도메인이 다를 때). 그래서 로드 프라미스로는 잡을 수 없고,
 * 지도를 그리고 있는 쪽이 따로 듣고 있어야 한다. 안 그러면 회색 화면만 남는다.
 */
export function subscribeAuthFailure(listener: () => void): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

/** SDK 를 (필요하면 받아서) 돌려준다. 여러 번 불러도 스크립트는 한 번만 받는다. */
export function loadNaverMaps(): Promise<NaverMapsLoad> {
  if (authFailed) return Promise.resolve({ ok: false, reason: "auth" });

  const loaded = window.naver?.maps;
  if (loaded) return Promise.resolve({ ok: true, maps: loaded });

  if (pending) return pending;

  const started = start();
  pending = started;
  void started.then((result) => {
    // 실패를 캐시에 남기면 화면을 다시 열어도 계속 실패한다. 성공만 남긴다.
    if (!result.ok && pending === started) pending = null;
  });
  return started;
}

async function start(): Promise<NaverMapsLoad> {
  let clientId: string | null;
  try {
    const res = await fetch("/api/map/config", { cache: "no-store" });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const body = (await res.json()) as { clientId?: string | null };
    clientId = body.clientId ?? null;
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (clientId === null) return { ok: false, reason: "no-key" };
  return loadScript(clientId);
}

function loadScript(clientId: string): Promise<NaverMapsLoad> {
  return new Promise((resolve) => {
    window.navermap_authFailure = () => {
      authFailed = true;
      pending = null;
      for (const listener of authListeners) listener();
    };

    const script = document.createElement("script");
    script.async = true;
    // 파라미터 이름은 `ncpKeyId` 다. 예전 문서에 널려 있는 `ncpClientId` 로 부르면 인증이 실패한다.
    // `submodules=geocoder` 는 붙이지 않는다. 주소는 BFF 가 REST 로 읽으므로 쓸 데가 없고,
    // 서브모듈은 `maps.js` 뒤에 따로 받아져서 로드가 끝난 직후에도 잠깐 undefined 다.
    script.src = `${SDK_SRC}?ncpKeyId=${encodeURIComponent(clientId)}`;

    script.onload = () => {
      const maps = window.naver?.maps;
      resolve(maps ? { ok: true, maps } : { ok: false, reason: "unavailable" });
    };
    script.onerror = () => {
      // 다시 시도할 때 죽은 태그가 남아 있지 않게 치운다.
      script.remove();
      resolve({ ok: false, reason: "unavailable" });
    };

    document.head.appendChild(script);
  });
}
