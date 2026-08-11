"use client";

import { useEffect, useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { TextField } from "@/design-system/components/TextField";
import { Button } from "@/design-system/components/Button";
import { Empty } from "@/design-system/components/Empty";
import { Spinner } from "@/design-system/components/Spinner";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, Container, READ_MAX, GUTTER } from "../shell";
import { manualLocation, searchPlaces, type PlaceLocation } from "../placeSearch";

/**
 * 장소 검색 (06 검색 결과 · 07 결과 없음).
 *
 * 두 디자인은 같은 화면의 두 상태다. 검색어에 맞는 장소가 있으면 목록을,
 * 없으면 "이름만 직접 입력" 안내를 보여준다.
 *
 * 장소 선택(지도) 화면 위에 덮여서 뜬다. 결과를 고르면 지도 화면으로 돌아가
 * 이름·지번주소·좌표를 넘긴다 — 등록 화면까지 한 번에 닫지 않는다.
 */

/**
 * 타이핑이 멎고 이만큼 지나야 네이버를 부른다.
 *
 * 글자마다 부르면 "구로국밥" 다섯 글자에 호출이 다섯 번 나간다. 지역 검색은 하루
 * 25,000건이라 그렇게 쓰면 금방 바닥난다.
 */
const DEBOUNCE_MS = 350;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; places: PlaceLocation[] }
  | { status: "error"; message: string };

/** 돌아온 답 하나. **어느 요청에 대한 답인지**(`key`)를 같이 들고 있어야 한다. */
type SearchAnswer = { key: string } & (
  | { ok: true; places: PlaceLocation[] }
  | { ok: false; message: string }
);

export function PlaceSearchScreen({
  initialQuery = "",
  onClose,
  onSelect,
}: {
  initialQuery?: string;
  onClose: () => void;
  onSelect: (location: PlaceLocation) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [answer, setAnswer] = useState<SearchAnswer | null>(null);
  /** 같은 검색어로 다시 부르기 위한 값. 바뀌기만 하면 되고 내용은 쓰지 않는다. */
  const [retryKey, setRetryKey] = useState(0);
  // 직접 입력 칸은 손대기 전까지 검색어를 그대로 따라간다. 디자인도 검색어가 채워진 상태다.
  const [manualDraft, setManualDraft] = useState("");
  const [manualEdited, setManualEdited] = useState(false);

  const trimmed = query.trim();
  const manualName = manualEdited ? manualDraft : query;

  /** 지금 화면이 답을 기다리고 있는 요청. 재시도까지 세어야 같은 검색어로 다시 눌러도 구분된다. */
  const requestKey = `${retryKey}:${trimmed}`;

  useEffect(() => {
    if (trimmed === "") return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const result = await searchPlaces(trimmed);
        if (cancelled) return;
        setAnswer(
          result.ok
            ? { key: requestKey, ok: true, places: result.places }
            : { key: requestKey, ok: false, message: result.message },
        );
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, requestKey]);

  // "찾는 중" 은 따로 세우는 상태가 아니라 **아직 이 검색어의 답이 없다** 는 사실이다.
  // 효과에서 loading 을 밀어 넣으면 글자를 칠 때마다 렌더가 한 번씩 더 돌고,
  // 무엇보다 답이 한 프레임이라도 검색어보다 뒤처지면 엉뚱한 가게를 고르게 된다.
  const state: SearchState =
    trimmed === ""
      ? { status: "idle" }
      : answer === null || answer.key !== requestKey
        ? { status: "loading" }
        : answer.ok
          ? { status: "done", places: answer.places }
          : { status: "error", message: answer.message };

  const empty = state.status === "done" && state.places.length === 0;

  return (
    <Screen>
      <StickyHeader maxWidth={READ_MAX}>
        <TopNavigation
          title="장소 검색"
          leftIcon="arrow-left"
          leftLabel="지도로 돌아가기"
          onLeftClick={onClose}
        />
      </StickyHeader>

      <div
        style={{
          background: "var(--color-background-default)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <Container maxWidth={READ_MAX} style={{ paddingTop: 12, paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <TextField
              size="lg"
              leftIcon="search"
              placeholder="장소 이름이나 주소를 입력해 주세요"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              onClick={onClose}
              className="text-label-lg"
              style={{
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
                whiteSpace: "nowrap",
                color: "var(--color-text-secondary)",
              }}
            >
              취소
            </button>
          </div>
        </Container>
      </div>

      {trimmed === "" ? (
        <Container maxWidth={READ_MAX} style={{ paddingTop: 24 }}>
          <span className="text-body-md" style={{ color: "var(--color-text-muted)" }}>
            찾으시는 장소의 이름이나 주소를 입력해 주세요.
          </span>
        </Container>
      ) : state.status === "loading" ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Spinner size={28} color="var(--color-background-brand)" />
        </div>
      ) : state.status === "error" ? (
        <Container maxWidth={READ_MAX} style={{ paddingTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Empty icon="error" width="100%" title="검색하지 못했어요" description={state.message} />
            <Button
              variant="secondary"
              size="lg"
              style={{ width: "100%" }}
              onClick={() => setRetryKey((key) => key + 1)}
            >
              다시 시도
            </Button>
          </div>
        </Container>
      ) : empty ? (
        <Container maxWidth={READ_MAX} style={{ paddingTop: 16, paddingBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Empty
              icon="search"
              width="100%"
              title="검색 결과가 없어요"
              description="입력하신 이름의 장소를 찾지 못했어요. 이름만 직접 입력하고 위치는 지도에서 맞출 수 있어요."
            />

            <TextField
              size="lg"
              label="장소 이름 직접 입력"
              placeholder="장소 이름을 입력해 주세요"
              value={manualName}
              helperText="주소와 좌표는 지도에서 직접 맞춰 주세요."
              onChange={(e) => {
                setManualEdited(true);
                setManualDraft(e.target.value);
              }}
            />

            <Button
              variant="primary"
              size="lg"
              style={{ width: "100%" }}
              disabled={manualName.trim() === ""}
              onClick={() => onSelect(manualLocation(manualName))}
            >
              이 이름으로 등록하기
            </Button>
          </div>
        </Container>
      ) : state.status === "done" ? (
        <Container maxWidth={READ_MAX} padded={false}>
          <div
            style={{
              padding: `8px ${GUTTER}`,
              background: "var(--color-background-subtle)",
            }}
          >
            <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
              검색 결과 {state.places.length}
            </span>
          </div>

          {state.places.map((place) => (
            <ResultRow key={place.id} place={place} onClick={() => onSelect(place)} />
          ))}
        </Container>
      ) : null}
    </Screen>
  );
}

function ResultRow({ place, onClick }: { place: PlaceLocation; onClick: () => void }) {
  // 요구사항대로 주소는 지번을 쓴다. 지번이 비어 오는 곳만 도로명으로 떨어뜨린다.
  const address = place.address ?? place.roadAddress;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: `12px ${GUTTER}`,
        boxSizing: "border-box",
        textAlign: "left",
        cursor: "pointer",
        background: "var(--color-background-default)",
        border: "none",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <Icon name="map-pin" size={20} color="var(--color-text-muted)" />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
          <span className="text-body-lg" style={{ color: "var(--color-text-default)" }}>
            {place.name}
          </span>
          {place.category !== null && (
            <span
              className="text-label-md"
              style={{
                color: "var(--color-text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {place.category}
            </span>
          )}
        </span>
        {address !== null && (
          <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
            {address}
          </span>
        )}
      </span>
      <Icon name="chevron-right" size={24} color="var(--color-text-muted)" />
    </button>
  );
}
