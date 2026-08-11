"use client";

/**
 * 네이버 지도.
 *
 * 핀은 지도 위에 찍는 마커가 아니라 **컨테이너 정중앙에 고정된 DOM** 이다.
 * 그래서 지도를 끌면 지도만 흐르고 핀은 제자리에 남는다 — 고른 좌표는 언제나 지도 중심이다.
 * 마커로 만들면 드래그 중에 핀이 같이 밀려서 "중심을 고른다" 는 감각이 깨진다.
 */

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Icon } from "@/design-system/Icon";
import { Spinner } from "@/design-system/components/Spinner";
import { MapPlaceholder } from "./MapPlaceholder";
import {
  loadNaverMaps,
  sameCoord,
  subscribeAuthFailure,
  type LatLngLiteral,
  type NaverEventHandle,
  type NaverMapInstance,
  type NaverMapsApi,
  type NaverMapsFailure,
  type NaverMarkerInstance,
} from "./naverMaps";

type Status = "loading" | "ready" | NaverMapsFailure;

const FAILURE_MESSAGE: Record<NaverMapsFailure, string> = {
  "no-key": "지도 API 키가 설정되지 않았어요",
  auth: "지도 인증에 실패했어요. 키와 등록된 웹 서비스 URL을 확인해 주세요",
  unavailable: "지도를 불러오지 못했어요",
};

export function NaverMap({
  center,
  zoom = 17,
  height,
  radius = 0,
  interactive = false,
  showCenterPin = true,
  marker = null,
  onCenterChange,
  ariaLabel,
  style,
}: {
  center: LatLngLiteral;
  zoom?: number;
  /** CSS 길이. 디자인 값을 뷰포트에 맞춰 clamp 로 넘긴다. */
  height: string | number;
  radius?: number;
  /**
   * true 면 끌고 확대해서 위치를 고를 수 있다. false 면 보기 전용 미리보기.
   * 바꾸면 지도를 통째로 다시 만든다(중심·배율·마커가 초기화된다). 화면마다 고정값으로 쓴다.
   */
  interactive?: boolean;
  showCenterPin?: boolean;
  /**
   * 지도 위에 찍을 마커. 이미 정해진 좌표를 보여주는 용도다(상세 화면).
   * 위치를 고르는 화면은 이걸 쓰지 않는다 — 거기서는 중앙 고정 핀이 곧 선택 좌표다.
   */
  marker?: LatLngLiteral | null;
  /** 지도가 멈춘 뒤의 중심 좌표. 드래그 중에는 부르지 않는다. */
  onCenterChange?: (coord: LatLngLiteral) => void;
  ariaLabel?: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const apiRef = useRef<NaverMapsApi | null>(null);
  const markerRef = useRef<NaverMarkerInstance | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // 지도를 만들 때의 초기값. 이후 prop 이 바뀌어도 지도를 다시 만들지 않는다.
  const initial = useRef({ center, zoom });

  // 콜백은 렌더마다 새 함수라 deps 에 넣으면 지도가 매번 다시 만들어진다.
  // ref 로 갈아끼워 리스너는 한 번만 붙이고 항상 최신 콜백을 부르게 한다.
  const onCenterChangeRef = useRef(onCenterChange);
  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  });

  useEffect(() => {
    let cancelled = false;
    let handle: NaverEventHandle | null = null;

    // 인증이 깨지면 SDK 는 `naver.maps` 를 통째로 비운다. 그 뒤로 지도 객체를 건드리면
    // 전부 터지므로, 상태를 바꾸기 **전에** 참조부터 버려서 아무도 못 만지게 한다.
    const unsubscribe = subscribeAuthFailure(() => {
      mapRef.current = null;
      apiRef.current = null;
      markerRef.current = null;
      setStatus("auth");
    });

    void (async () => {
      const loaded = await loadNaverMaps();
      if (cancelled) return;

      if (!loaded.ok) {
        setStatus(loaded.reason);
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const { maps } = loaded;

      try {
        const map = new maps.Map(container, {
          center: new maps.LatLng(initial.current.center.lat, initial.current.center.lng),
          zoom: initial.current.zoom,
          // 미리보기에서는 손대도 움직이지 않아야 한다. 제스처를 종류별로 다 꺼야
          // 모바일에서 두 손가락·더블탭으로 확대되는 길이 남지 않는다.
          draggable: interactive,
          pinchZoom: interactive,
          scrollWheel: interactive,
          keyboardShortcuts: interactive,
          disableDoubleClickZoom: !interactive,
          disableDoubleTapZoom: !interactive,
          disableTwoFingerTapZoom: !interactive,
          zoomControl: interactive,
          zoomControlOptions: { position: maps.Position.TOP_RIGHT },
          mapTypeControl: false,
          scaleControl: false,
        });

        // 'idle' 은 움직임이 멈춘 뒤 한 번 온다. 'center_changed' 는 드래그 내내 쏟아져서
        // 그때마다 리버스 지오코딩을 부르면 호출 한도부터 바닥난다.
        handle = maps.Event.addListener(map, "idle", () => {
          const current = map.getCenter();
          onCenterChangeRef.current?.({ lat: current.lat(), lng: current.lng() });
        });

        apiRef.current = maps;
        mapRef.current = map;
        setStatus("ready");
      } catch {
        setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      // SDK 가 이미 자기 자신을 정리한 뒤일 수 있다. 정리에 실패해도 언마운트는 끝나야 한다.
      try {
        if (handle) apiRef.current?.Event.removeListener(handle);
        markerRef.current?.setMap(null);
        mapRef.current?.destroy();
      } catch {
        // 버리는 지도라 더 할 일이 없다.
      }
      apiRef.current = null;
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [interactive]);

  // 바깥에서 좌표를 넘겨 지도를 옮기는 경우(검색 결과 선택 등).
  // 지금 중심과 같으면 건드리지 않는다 — 안 그러면 setCenter 가 다시 idle 을 깨워 서로를 부른다.
  useEffect(() => {
    const map = mapRef.current;
    const maps = apiRef.current;
    if (!map || !maps) return;

    try {
      const current = map.getCenter();
      if (sameCoord({ lat: current.lat(), lng: current.lng() }, center)) return;
      map.setCenter(new maps.LatLng(center.lat, center.lng));
    } catch {
      // 인증 실패·할당량 초과로 SDK 가 무너진 뒤라면 여기서 터진다. 그대로 두면 지도를
      // 품고 있는 등록 폼까지 같이 죽어서 쓰던 사진·후기가 날아간다. 지도만 버린다.
      mapRef.current = null;
      apiRef.current = null;
    }
  }, [center, status]);

  // 마커. 지도가 만들어진 뒤에야 붙일 수 있으므로 `status` 도 같이 본다.
  // 좌표를 그대로 deps 에 넣는 이유: prop 객체는 렌더마다 새로 만들어져서 값이 같아도
  // 매번 새 마커를 찍게 된다.
  const markerLat = marker?.lat ?? null;
  const markerLng = marker?.lng ?? null;
  useEffect(() => {
    const map = mapRef.current;
    const maps = apiRef.current;
    if (!map || !maps) return;

    try {
      if (markerLat === null || markerLng === null) {
        // 마커를 지우는 방법은 지도에서 떼어내는 것뿐이다.
        markerRef.current?.setMap(null);
        markerRef.current = null;
        return;
      }

      const position = new maps.LatLng(markerLat, markerLng);
      if (markerRef.current) markerRef.current.setPosition(position);
      else markerRef.current = new maps.Marker({ position, map });
    } catch {
      // 지도 참조를 버리는 위 effect 와 같은 이유다. 인증이 깨진 뒤라면 SDK 가 이미 비어 있다.
      markerRef.current = null;
    }
  }, [markerLat, markerLng, status]);

  if (status === "no-key" || status === "auth" || status === "unavailable") {
    return <MapPlaceholder height={height} radius={radius} message={FAILURE_MESSAGE[status]} />;
  }

  return (
    <div
      style={{
        position: "relative",
        height,
        borderRadius: radius,
        overflow: "hidden",
        background: "var(--color-background-muted)",
        ...style,
      }}
    >
      <div
        ref={containerRef}
        role={interactive ? "application" : "img"}
        aria-label={ariaLabel}
        style={{ width: "100%", height: "100%" }}
      />

      {status === "ready" && showCenterPin && <CenterPin />}

      {status === "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-background-muted)",
          }}
        >
          <Spinner size={28} color="var(--color-background-brand)" />
        </div>
      )}
    </div>
  );
}

/**
 * 지도 정중앙에 박아 두는 핀.
 *
 * 크기가 0인 점을 중심에 놓고 그 점을 기준으로 아이콘을 얹는다.
 * 아이콘은 `-100%` 만큼 올려서 **핀 끝**이 중심을 가리키게 한다 — 아이콘을 그냥 가운데
 * 두면 실제로 고르는 지점보다 핀이 반 칸 아래를 찍는다.
 */
function CenterPin() {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, zIndex: 10, pointerEvents: "none" }}
    >
      <div
        style={{
          position: "absolute",
          transform: "translate(-50%, -100%)",
          lineHeight: 0,
          filter: "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35))",
        }}
      >
        <Icon name="map-pin" size={36} color="var(--color-text-brand)" />
      </div>

      {/* 핀 끝이 정확히 어느 점을 물고 있는지 드래그 중에도 보이게 하는 표식. */}
      <div
        style={{
          position: "absolute",
          transform: "translate(-50%, -50%)",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--color-text-brand)",
          opacity: 0.75,
        }}
      />
    </div>
  );
}
