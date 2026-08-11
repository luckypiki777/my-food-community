"use client";

import { useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { Button } from "@/design-system/components/Button";
import { Empty } from "@/design-system/components/Empty";
import { Spinner } from "@/design-system/components/Spinner";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, FixedBottom, Container, READ_MAX, GUTTER } from "../shell";
import { NaverMap } from "../NaverMap";
import { placeMeta, usePlaceDetail, type PlaceDetail } from "../usePlaces";
import type { AppNav } from "../types";

/** 디자인은 170. 화면이 넓어지면 같이 커진다. */
const MAP_HEIGHT = "clamp(170px, 26vw, 220px)";

export function DetailScreen({ placeId, nav }: { placeId: number | null; nav: AppNav }) {
  const { place, status } = usePlaceDetail(placeId);

  return (
    <Screen hasBottomBar>
      <StickyHeader inverse maxWidth={READ_MAX}>
        <TopNavigation
          variant="inverse"
          title="맛집 상세"
          leftIcon="arrow-left"
          onLeftClick={() => nav.navigate("main")}
        />
      </StickyHeader>

      {status === "loading" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Spinner size={32} color="var(--color-background-brand)" />
        </div>
      )}

      {status === "error" && (
        <Container maxWidth={READ_MAX} style={{ paddingTop: 40 }}>
          <Empty
            icon="error"
            title="맛집을 불러오지 못했어요"
            description="삭제되었거나 잠시 문제가 생겼어요"
          />
        </Container>
      )}

      {status === "ready" && place && <PlaceBody place={place} nav={nav} />}

      <FixedBottom maxWidth={READ_MAX}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: `12px ${GUTTER} 16px`,
            background: "var(--color-background-surface)",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <Button
            variant="secondary"
            size="lg"
            leftIcon="bookmark"
            disabled={!place}
            onClick={() => {
              if (!place) return;
              const key = String(place.id);
              const saved = nav.bookmarks.has(key);
              nav.toggleBookmark(key);
              nav.toast(
                saved ? "찜을 해제했어요" : "찜 목록에 저장했어요",
                saved ? "info" : "success",
              );
            }}
          >
            {place && nav.bookmarks.has(String(place.id)) ? "저장됨" : "저장"}
          </Button>

          {/* 내 글에서만 수정으로 간다. 판단은 서버가 내려준 isMine 을 그대로 쓴다. */}
          {place?.isMine ? (
            <Button
              variant="primary"
              size="lg"
              leftIcon="edit"
              style={{ flex: 1 }}
              onClick={() => nav.openEdit(String(place.id))}
            >
              수정
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              leftIcon="arrow-up"
              style={{ flex: 1 }}
              disabled={!place}
              onClick={() => nav.toast("길찾기는 준비 중이에요", "info")}
            >
              길찾기
            </Button>
          )}
        </div>
      </FixedBottom>
    </Screen>
  );
}

function PlaceBody({ place, nav }: { place: PlaceDetail; nav: AppNav }) {
  const [active, setActive] = useState(0);
  const images = place.images;
  const hero = images[active] ?? images[0];

  const copyAddress = async () => {
    try {
      await navigator.clipboard?.writeText(place.address);
      nav.toast("주소를 복사했어요", "success");
    } catch {
      nav.toast("주소 복사에 실패했어요", "error");
    }
  };

  return (
    <Container maxWidth={READ_MAX} padded={false}>
      <div style={{ position: "relative" }}>
        {hero ? (
          <img
            src={hero.url}
            alt={place.title}
            style={{
              display: "block",
              width: "100%",
              height: "clamp(200px, 42vw, 320px)",
              objectFit: "cover",
              background: "var(--color-background-muted)",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "clamp(200px, 42vw, 320px)",
              background: "var(--color-background-muted)",
            }}
          >
            <Icon name="image" size={32} color="var(--color-text-muted)" />
          </div>
        )}

        {images.length > 1 && (
          <span
            className="text-label-md"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              padding: "3px 8px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.45)",
              color: "var(--color-text-on-inverse)",
            }}
          >
            {active + 1}/{images.length}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: `18px ${GUTTER} 24px`,
        }}
      >
        {images.length > 1 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`사진 ${index + 1}`}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                style={{
                  flexShrink: 0,
                  width: 64,
                  height: 64,
                  padding: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "var(--color-background-muted)",
                  border:
                    index === active
                      ? "2px solid var(--color-border-brand)"
                      : "1px solid var(--color-border-subtle)",
                }}
              >
                <img
                  src={image.url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 className="text-heading-lg" style={{ color: "var(--color-text-default)", margin: 0 }}>
            {place.title}
          </h1>
          <span className="text-body-md" style={{ color: "var(--color-text-muted)" }}>
            {placeMeta(place)}
          </span>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="text-heading-sm" style={{ color: "var(--color-text-default)", margin: 0 }}>
            이용 후기
          </h2>
          <p
            className="text-body-md"
            style={{
              color: "var(--color-text-secondary)",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {place.content}
          </p>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 className="text-heading-sm" style={{ color: "var(--color-text-default)", margin: 0 }}>
              주소
            </h2>
            <button
              type="button"
              onClick={copyAddress}
              className="text-label-lg"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: "none",
                background: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              <Icon name="copy" size={16} color="var(--color-text-muted)" />
              복사
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="text-body-md" style={{ color: "var(--color-text-secondary)" }}>
              {place.address}
            </span>
            {/* 등록할 때 지도에서 고른 상호. 글 제목과 같으면 같은 말을 두 번 쓰지 않는다. */}
            {place.name !== place.title && (
              <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
                {place.name}
              </span>
            )}
          </div>
          {/* DB 에 저장된 좌표에 마커를 찍는다. 보기 전용이라 끌리지 않고, 중앙 고정 핀도
              쓰지 않는다 — 여기서 고르는 게 아니라 정해진 곳을 보여주는 지도다. */}
          <NaverMap
            center={{ lat: place.lat, lng: place.lng }}
            marker={{ lat: place.lat, lng: place.lng }}
            showCenterPin={false}
            height={MAP_HEIGHT}
            radius={14}
            ariaLabel={`${place.name} 위치 지도`}
          />
        </section>
      </div>
    </Container>
  );
}

