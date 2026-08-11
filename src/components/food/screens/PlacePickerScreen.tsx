"use client";

import { useEffect, useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { TextField } from "@/design-system/components/TextField";
import { Button } from "@/design-system/components/Button";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, Container, Overlay, READ_MAX } from "../shell";
import { NaverMap } from "../NaverMap";
import { GURO_DIGITAL_STATION, sameCoord, type LatLngLiteral } from "../naverMaps";
import { reverseGeocode } from "../reverseGeocode";
import { type PlaceLocation } from "../placeSearch";
import { PlaceSearchScreen } from "./PlaceSearchScreen";

/** 디자인은 360×480. 화면이 커져도 하단 "이 위치로 등록하기" 가 밀려나지 않게 vh 로 묶는다. */
const MAP_HEIGHT = "clamp(280px, 48vh, 480px)";

/** 건물 한 채가 구분되는 배율. 더 넓으면 핀을 원하는 가게에 맞추기 어렵다. */
const MAP_ZOOM = 17;

/** 좌표를 아직 못 읽었을 때 주소 칸에 넣는 문구. */
const UNNAMED = "지도에서 선택한 위치";

type AddressState = { status: "loading" } | { status: "ready"; text: string } | { status: "failed" };

/**
 * 이름이 어디서 왔는지.
 *
 * 검색 결과로 고른 이름은 그 좌표를 가리키므로, 지도를 끌어 옮기면 더 이상 그 가게가
 * 아니다 — 버려야 한다. 반대로 직접 입력한 이름은 사용자가 붙인 이름이고, 좌표가 없어서
 * **지도를 끌어 위치를 맞추는 게 정상 흐름**이다. 같이 지우면 방금 친 이름이 사라진다.
 */
type NameSource = "search" | "manual";

/**
 * 장소 선택 (05 장소 등록).
 *
 * 등록 화면에서 "장소 입력하기" 로 들어오는 화면이다. 지도를 끌어 가운데 핀에 위치를
 * 맞추면 그 좌표의 주소를 읽어 등록 화면으로 돌려준다.
 *
 * 위쪽 검색창을 누르면 검색 화면(06/07)이 이 화면 **위에** 덮인다. 갈아끼우지 않는 이유는
 * 등록 폼 때와 같다 — 돌아왔을 때 지도 위치와 고른 값이 그대로 남아 있어야 한다.
 *
 * 검색 결과를 고르면 이름은 검색창에, 지번 주소는 아래 주소 영역에, 좌표는 지도 중심에
 * 들어간다. 결과가 없어 이름만 직접 입력한 경우에는 **이름만** 받는다 — 주소·좌표는
 * 지금 값을 그대로 두고, 위치는 사용자가 지도를 끌어서 맞춘다.
 */
export function PlacePickerScreen({
  initial,
  onClose,
  onConfirm,
}: {
  initial: PlaceLocation | null;
  onClose: () => void;
  onConfirm: (location: PlaceLocation) => void;
}) {
  const hasInitialCoord = initial?.lat != null && initial?.lng != null;

  const [query, setQuery] = useState(initial?.name ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [center, setCenter] = useState<LatLngLiteral>(() =>
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : GURO_DIGITAL_STATION,
  );
  /** 검색·직접입력으로 정한 가게 이름. */
  const [placeName, setPlaceName] = useState<string | null>(initial?.name ?? null);
  const [nameSource, setNameSource] = useState<NameSource | null>(
    initial === null ? null : hasInitialCoord ? "search" : "manual",
  );
  /**
   * 검색 결과가 알려준 지번 주소.
   *
   * 검색으로 고른 곳의 주소는 **네이버가 준 지번 주소**를 그대로 쓴다. 리버스 지오코딩도
   * 지번을 주지만 굳이 다시 부르지 않는다 — 방금 목록에서 본 주소가 글자 그대로 남아야 하고
   * (가게가 앉은 필지의 번지는 대표 좌표를 되짚은 번지와 늘 같지는 않다), 리버스 지오코딩은
   * 호출마다 값을 치르는 API 다.
   * 지도를 끌면 이 값은 버려지고 그때부터 리버스 지오코딩이 주소를 맡는다.
   */
  const [seedAddress, setSeedAddress] = useState<string | null>(
    hasInitialCoord ? (initial?.address ?? null) : null,
  );
  /** 마지막으로 읽어 낸 결과. 어느 좌표의 답인지 같이 들고 있어야 한다. */
  const [resolved, setResolved] = useState<{ coord: LatLngLiteral; text: string | null } | null>(
    null,
  );

  // 중심이 바뀔 때마다 그 좌표의 주소를 다시 읽는다.
  // `center` 는 값이 실제로 달라질 때만 새 객체로 갈아끼우므로 좌표당 한 번만 돈다.
  // 검색 결과가 지번 주소를 같이 준 경우에는 부르지 않는다 — 이미 답을 들고 있고,
  // 리버스 지오코딩도 호출 한도가 있는 유료 API 다.
  useEffect(() => {
    if (seedAddress !== null) return;

    let cancelled = false;

    void (async () => {
      const found = await reverseGeocode(center);
      if (!cancelled) setResolved({ coord: center, text: found });
    })();

    return () => {
      cancelled = true;
    };
  }, [center, seedAddress]);

  // "읽는 중" 은 따로 세우는 상태가 아니라 **아직 이 좌표의 답이 없다** 는 사실이다.
  // 효과 안에서 loading 을 밀어 넣으면 좌표가 바뀔 때마다 렌더가 한 번씩 더 돈다.
  const geocoded: AddressState =
    resolved === null || !sameCoord(resolved.coord, center)
      ? { status: "loading" }
      : resolved.text === null
        ? { status: "failed" }
        : { status: "ready", text: resolved.text };

  // 검색이 준 지번 주소가 있으면 그게 정답이다. 없을 때만 리버스 지오코딩 결과를 쓴다.
  const addressText = seedAddress ?? (geocoded.status === "ready" ? geocoded.text : null);
  // seed 가 있으면 위 효과가 아예 돌지 않으므로 geocoded 는 영영 loading 이다. 같이 봐야 한다.
  const addressPending = seedAddress === null && geocoded.status === "loading";

  const ADDRESS_FAILED = "주소를 읽지 못했어요. 지도를 조금 움직여 보세요.";
  const ADDRESS_LOADING = "주소를 확인하는 중이에요…";

  // 카드 아래 줄. 이름이 없으면 윗줄이 이미 주소라 같은 문장을 두 번 쓰지 않는다.
  const detailLine =
    placeName === null
      ? addressText === null && !addressPending
        ? ADDRESS_FAILED
        : null
      : addressPending
        ? ADDRESS_LOADING
        : (addressText ?? ADDRESS_FAILED);

  // 지도를 끌어서 옮긴 경우. NaverMap 이 콜백을 ref 로 들고 있어 여기서 memo 하지 않아도 된다.
  const handleCenterChange = (coord: LatLngLiteral) => {
    if (sameCoord(center, coord)) return;
    setCenter(coord);
    setSeedAddress(null);
    if (nameSource === "search") {
      setPlaceName(null);
      setNameSource(null);
    }
  };

  /** 검색 화면에서 고른 결과를 반영하고 검색 화면을 닫는다. */
  const applySearchResult = (place: PlaceLocation) => {
    setSearchOpen(false);
    // 이름은 어느 경우든 검색창에 넣는다.
    setQuery(place.name);
    setPlaceName(place.name);

    if (place.lat === null || place.lng === null) {
      // 결과가 없어 이름만 직접 입력한 경우. 주소·좌표는 지금 값을 그대로 둔다.
      setNameSource("manual");
      return;
    }

    setNameSource("search");
    // 요구사항대로 지번을 쓴다. 지번이 비어 온 곳만 도로명으로 떨어뜨리고, 둘 다 없으면
    // null 로 둬서 리버스 지오코딩이 대신 읽게 한다 — 여기에 가게 이름을 넣으면 안 된다.
    setSeedAddress(place.address ?? place.roadAddress);
    setCenter({ lat: place.lat, lng: place.lng });
  };

  /**
   * 주소를 못 읽은 채로는 돌려보내지 않는다.
   *
   * 저장되는 지도 정보는 장소명 · 주소 · 좌표가 한 덩어리다. 주소만 빠진 채 등록 화면으로
   * 돌아가면 거기서 "필수 항목 확인" 으로 막히는데, 정작 무엇이 빠졌는지는 이 화면에서만
   * 알 수 있다. 고를 수 없는 자리라는 걸 여기서 말해 주는 편이 낫다.
   */
  const canConfirm = !addressPending && addressText !== null;

  const confirm = () => {
    if (addressText === null) return;
    onConfirm({
      id: `coord:${center.lat.toFixed(6)},${center.lng.toFixed(6)}`,
      name: placeName ?? addressText,
      address: addressText,
      roadAddress: null,
      category: null,
      lat: center.lat,
      lng: center.lng,
    });
  };

  return (
    <>
      <Screen>
        <StickyHeader maxWidth={READ_MAX}>
          <TopNavigation
            title="장소 등록"
            leftIcon="arrow-left"
            leftLabel="등록 화면으로"
            onLeftClick={onClose}
          />
        </StickyHeader>

        <Container maxWidth={READ_MAX} style={{ paddingTop: 16, paddingBottom: 16 }}>
          {/* 여기서는 입력받지 않는다. 누르면 검색 화면이 덮이고, 검색은 거기서 한다.
              readOnly 라 모바일 키보드가 올라왔다가 화면이 바뀌며 접히는 일도 없다.

              클릭을 감싼 div 가 받는 이유: TextField 의 `style` 과 이벤트는 각각 바깥 래퍼와
              <input> 으로 갈라져서, input 에만 onClick 을 걸면 돋보기 아이콘과 좌우 여백이
              눌리지 않는다. 여기서 받으면 필드 어디를 눌러도 열린다. */}
          <div onClick={() => setSearchOpen(true)} style={{ cursor: "pointer" }}>
            <TextField
              size="lg"
              leftIcon="search"
              placeholder="장소나 주소를 검색해 주세요"
              value={query}
              readOnly
              // 키보드로 온 사람을 위해. 마우스·터치는 위 래퍼가 이미 받는다.
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSearchOpen(true);
                }
              }}
              style={{ width: "100%" }}
            />
          </div>
        </Container>

        <Container maxWidth={READ_MAX} padded={false}>
          <NaverMap
            center={center}
            zoom={MAP_ZOOM}
            height={MAP_HEIGHT}
            interactive
            onCenterChange={handleCenterChange}
            ariaLabel="장소를 고르는 지도. 지도를 움직이면 가운데 핀이 가리키는 위치가 선택됩니다."
          />
        </Container>

        <Container maxWidth={READ_MAX} style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
              지도를 움직여 가운데 핀을 원하는 위치에 맞춰 주세요.
            </span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 16,
                borderRadius: 12,
                background: "var(--color-background-brand-subtle)",
                border: "1px solid var(--color-border-brand)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="map-pin" size={20} color="var(--color-text-brand)" />
                <span className="text-label-md" style={{ color: "var(--color-text-brand)" }}>
                  선택한 위치
                </span>
              </span>

              {/* 주소를 읽는 동안에도 자리를 비우지 않는다. 한 줄이 사라졌다 나타나면 아래 버튼이 튄다. */}
              {addressPending && placeName === null ? (
                <span className="text-body-lg" style={{ color: "var(--color-text-muted)" }}>
                  {ADDRESS_LOADING}
                </span>
              ) : (
                <>
                  <span className="text-body-lg" style={{ color: "var(--color-text-default)" }}>
                    {placeName ?? addressText ?? UNNAMED}
                  </span>
                  {detailLine !== null && (
                    <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
                      {detailLine}
                    </span>
                  )}
                </>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              style={{ width: "100%" }}
              disabled={!canConfirm}
              onClick={confirm}
            >
              {addressPending ? "주소 확인 중…" : "이 위치로 등록하기"}
            </Button>
          </div>
        </Container>
      </Screen>

      {searchOpen && (
        <Overlay label="장소 검색">
          <PlaceSearchScreen
            initialQuery={query}
            onClose={() => setSearchOpen(false)}
            onSelect={applySearchResult}
          />
        </Overlay>
      )}
    </>
  );
}
