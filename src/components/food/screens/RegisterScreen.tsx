"use client";

import { useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { TextField } from "@/design-system/components/TextField";
import { Textarea } from "@/design-system/components/Textarea";
import { Button } from "@/design-system/components/Button";
import { Empty } from "@/design-system/components/Empty";
import { Spinner } from "@/design-system/components/Spinner";
import { FileUploader, type FileItemData } from "@/design-system/components/FileUploader";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, FixedBottom, Container, Overlay, READ_MAX, GUTTER } from "../shell";
import { MapPlaceholder } from "../MapPlaceholder";
import { NaverMap } from "../NaverMap";
import { type PlaceLocation } from "../placeSearch";
import { createPlace, updatePlace, usePlaceDetail, type MapLocation } from "../usePlaces";
import { PlacePickerScreen } from "./PlacePickerScreen";
import type { AppNav } from "../types";

/**
 * BFF(src/lib/bff/place.ts)와 DB 체크 제약이 쓰는 값과 같다.
 * 서버가 최종 판정을 하지만, 여기서 먼저 걸러 왕복 한 번을 아낀다.
 */
const TITLE_MAX = 100;
const CONTENT_MIN = 10;
const CONTENT_MAX = 2000;
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** 디자인은 120. 화면이 넓어지면 같이 커진다. */
const MAP_HEIGHT = "clamp(120px, 20vw, 170px)";

type NewPhoto = { id: string; file: File };

/** "사진을" / "주소를" — 앞 글자의 받침에 따라 목적격 조사를 고른다. */
function objectParticle(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return "을";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}

export function RegisterScreen({ nav, placeId }: { nav: AppNav; placeId?: number | null }) {
  const isEdit = placeId !== null && placeId !== undefined;
  const { place, status } = usePlaceDetail(isEdit ? placeId : null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  /** 장소 선택 화면에서 고른 위치. 주소 칸에 보이는 문구도 여기서 나온다. */
  const [location, setLocation] = useState<PlaceLocation | null>(null);
  /** 장소 선택(지도) 화면을 덮어 띄우는 중인지. 검색은 그 화면 안에서 이어진다. */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  // 수정 화면은 불러온 값으로 폼을 한 번 채운다.
  // effect 가 아니라 렌더 중에 맞춰야 빈 폼이 한 프레임 먼저 보이지 않는다.
  if (place && hydratedId !== place.id) {
    setHydratedId(place.id);
    setTitle(place.title);
    setContent(place.content);
    // 저장해 둔 지도 정보를 그대로 되살린다. 좌표까지 남아 있어서 미리보기 지도도,
    // 다시 여는 장소 선택 화면도 등록했던 자리에서 시작한다.
    setLocation({
      id: `place:${place.id}`,
      name: place.name,
      address: place.address,
      roadAddress: null,
      category: null,
      lat: place.lat,
      lng: place.lng,
    });
    setNewPhotos([]);
    setRemovedIds([]);
    setTouched(false);
  }

  const keptImages = (place?.images ?? []).filter((image) => !removedIds.includes(image.id));
  const totalImages = (isEdit ? keptImages.length : 0) + newPhotos.length;

  /**
   * 저장에 쓸 수 있게 정규화한 지도 정보. 주소·좌표 중 하나라도 비면 null 이다.
   *
   * 보이는 주소도 이 값에서만 뽑는다. 문구를 따로 들고 있으면 "주소는 채워졌는데
   * 좌표가 없어서 저장은 막히는" 상태가 생겨, 사용자는 왜 막혔는지 알 수 없다.
   */
  const savedLocation: MapLocation | null =
    location !== null && location.address !== null && location.lat !== null && location.lng !== null
      ? {
          address: location.address,
          name: location.name,
          lat: location.lat,
          lng: location.lng,
        }
      : null;

  const addressText = savedLocation?.address ?? "";

  const photoMissing = totalImages === 0;
  const titleMissing = title.trim().length === 0;
  const contentShort = content.trim().length < CONTENT_MIN;
  // 지도 정보는 필수다. 서버도 DB 도 같은 규칙이라 여기서 막지 않으면 400 으로 돌아온다.
  const locationMissing = savedLocation === null;
  const valid = !photoMissing && !titleMissing && !contentShort && !locationMissing;

  // 디자인의 배너는 지금 비어 있는 항목만 짚어준다.
  const missing = [
    photoMissing ? "사진" : null,
    titleMissing ? "맛집 이름" : null,
    contentShort ? "설명" : null,
    locationMissing ? "주소" : null,
  ].filter((label): label is string => label !== null);

  // 아직 아무것도 건드리지 않은 폼에 빨간 줄부터 긋지 않는다.
  const showErrors = touched && !valid;

  const addPhotos = (files: FileList) => {
    setTouched(true);
    const picked = Array.from(files);
    const room = MAX_IMAGES - totalImages;
    if (room <= 0) {
      nav.toast(`사진은 ${MAX_IMAGES}장까지 올릴 수 있어요`, "error");
      return;
    }

    const accepted: NewPhoto[] = [];
    for (const file of picked.slice(0, room)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        nav.toast("JPG · PNG · WebP · GIF 만 올릴 수 있어요", "error");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        nav.toast("사진은 5MB 이하만 올릴 수 있어요", "error");
        continue;
      }
      accepted.push({ id: `new:${crypto.randomUUID()}`, file });
    }

    if (picked.length > room) {
      nav.toast(`사진은 ${MAX_IMAGES}장까지만 올릴 수 있어요`, "info");
    }
    if (accepted.length > 0) setNewPhotos((prev) => [...prev, ...accepted]);
  };

  const removePhoto = (id: string) => {
    setTouched(true);
    if (id.startsWith("new:")) {
      setNewPhotos((prev) => prev.filter((photo) => photo.id !== id));
      return;
    }
    setRemovedIds((prev) => [...prev, id]);
  };

  /** 지도에서 고른 장소를 폼에 반영하고 하위 흐름을 닫는다. */
  const applyLocation = (picked: PlaceLocation) => {
    setLocation(picked);
    setTouched(true);
    setPickerOpen(false);
  };

  const submit = async () => {
    // savedLocation 검사는 valid 에 이미 들어 있지만, 여기서 한 번 더 봐야
    // 타입까지 좁혀져 아래에서 location 을 그대로 넘길 수 있다.
    if (!valid || saving || savedLocation === null) return;

    setSaving(true);
    // 지도 정보는 넷을 함께 보낸다. 수정에서도 마찬가지다 — 서버가 반쪽짜리를 거절한다.
    const input = {
      title: title.trim(),
      content: content.trim(),
      location: savedLocation,
      files: newPhotos.map((photo) => photo.file),
      removeImageIds: removedIds,
    };
    const result =
      isEdit && placeId !== null && placeId !== undefined
        ? await updatePlace(placeId, input)
        : await createPlace(input);
    setSaving(false);

    if (!result.ok) {
      // 서버가 돌려준 문구를 그대로 보여준다. 검증 규칙이 한 곳에만 있어야 어긋나지 않는다.
      nav.toast(result.message, "error");
      return;
    }

    nav.reloadPlaces();
    nav.toast(isEdit ? "맛집을 수정했어요" : "맛집을 등록했어요", "success");
    if (isEdit) nav.openDetail(String(result.place.id));
    else nav.navigate("main");
  };

  const items: FileItemData[] = [
    ...keptImages.map((image, index) => ({
      id: image.id,
      name: `등록된 사진 ${index + 1}`,
      status: "complete" as const,
    })),
    ...newPhotos.map((photo) => ({
      id: photo.id,
      name: photo.file.name,
      status: "complete" as const,
    })),
  ];

  const backToList = () => (isEdit ? nav.openDetail(String(placeId)) : nav.navigate("main"));

  const submitLabel = saving
    ? "저장 중…"
    : !valid
      ? "필수 항목 확인"
      : isEdit
        ? "수정 완료"
        : "맛집 등록";

  return (
    <>
      <Screen hasBottomBar>
        <StickyHeader inverse maxWidth={READ_MAX}>
          <TopNavigation
            variant="inverse"
            title={isEdit ? "맛집 수정" : "맛집 등록"}
            leftIcon="arrow-left"
            onLeftClick={backToList}
          />
        </StickyHeader>

        {isEdit && status === "loading" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Spinner size={32} color="var(--color-background-brand)" />
          </div>
        ) : isEdit && status === "error" ? (
          <Container maxWidth={READ_MAX} style={{ paddingTop: 40 }}>
            <Empty
              icon="error"
              title="맛집을 불러오지 못했어요"
              description="삭제되었거나 잠시 문제가 생겼어요"
            />
          </Container>
        ) : (
          <Container maxWidth={READ_MAX} style={{ paddingTop: 16, paddingBottom: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {showErrors && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid var(--color-border-error)",
                    background: "var(--color-background-default)",
                  }}
                >
                  <Icon name="error" size={20} color="var(--color-text-error)" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="text-label-lg" style={{ color: "var(--color-text-error)" }}>
                      저장할 수 없어요
                    </span>
                    <span className="text-label-md" style={{ color: "var(--color-text-error)" }}>
                      {missing.join(", ")}
                      {objectParticle(missing[missing.length - 1])} 확인해 주세요.
                    </span>
                  </div>
                </div>
              )}

              <FileUploader
                helperText={`사진 추가 · 대표 사진 1장은 꼭 필요해요 (${totalImages}/${MAX_IMAGES})`}
                selectLabel="사진 선택"
                error={showErrors && photoMissing}
                disabled={saving}
                items={items}
                onSelect={addPhotos}
                onRemove={removePhoto}
              />

              <TextField
                label="맛집 이름"
                placeholder="맛집 이름을 입력해 주세요"
                size="lg"
                value={title}
                maxLength={TITLE_MAX}
                disabled={saving}
                onChange={(e) => {
                  setTouched(true);
                  setTitle(e.target.value);
                }}
                errorMessage={
                  showErrors && titleMissing ? "맛집 이름을 입력해 주세요." : undefined
                }
              />

              <Textarea
                label="어떤 곳인가요?"
                placeholder="어떤 점이 좋았는지 알려 주세요"
                value={content}
                onChange={(e) => {
                  setTouched(true);
                  setContent(e.target.value);
                }}
                rows={3}
                maxLength={CONTENT_MAX}
                showCounter
                disabled={saving}
                helperText={`최소 ${CONTENT_MIN}자 이상 입력해 주세요`}
                errorMessage={
                  showErrors && contentShort
                    ? `후기는 ${CONTENT_MIN}자 이상 입력해 주세요.`
                    : undefined
                }
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="text-label-lg" style={{ color: "var(--color-text-default)" }}>
                  주소
                </span>

                {/* 주소를 정하는 길은 장소 선택 화면 하나뿐이다. 여기서 직접 입력받지 않는다 —
                    주소 문구와 좌표가 따로 놀면 지도가 엉뚱한 곳을 가리키게 된다. */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <TextField
                    size="lg"
                    placeholder="주소를 검색해 주세요"
                    value={addressText}
                    readOnly
                    disabled={saving}
                    onClick={() => setPickerOpen(true)}
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  />
                  <Button
                    variant="primary"
                    size="md"
                    disabled={saving}
                    onClick={() => setPickerOpen(true)}
                  >
                    검색
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon="map-pin"
                  disabled={saving}
                  style={{ width: "100%" }}
                  onClick={() => setPickerOpen(true)}
                >
                  장소 입력하기
                </Button>

                {showErrors && locationMissing ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="error" size={16} color="var(--color-text-error)" />
                    <span className="text-label-md" style={{ color: "var(--color-text-error)" }}>
                      지도에서 장소를 선택해 주세요.
                    </span>
                  </span>
                ) : savedLocation !== null ? (
                  <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
                    장소명 · {savedLocation.name}
                  </span>
                ) : (
                  <span className="text-label-md" style={{ color: "var(--color-text-muted)" }}>
                    지도에서 위치를 고르면 장소명 · 주소 · 좌표가 함께 저장돼요.
                  </span>
                )}
              </div>

              {/* 고른 좌표를 그대로 다시 보여준다. 여기서는 못 움직인다 — 위치를 바꾸는 곳은
                  "장소 입력하기" 로 여는 지도 화면 하나뿐이어야 한다.
                  중앙 고정 핀 대신 마커를 쓴다. 여기서 고르는 게 아니니 "지도 중심 = 선택"
                  이라는 신호를 줄 이유가 없고, 저장된 좌표에 찍힌 점 하나면 된다. */}
              {savedLocation !== null ? (
                <NaverMap
                  center={{ lat: savedLocation.lat, lng: savedLocation.lng }}
                  marker={{ lat: savedLocation.lat, lng: savedLocation.lng }}
                  showCenterPin={false}
                  height={MAP_HEIGHT}
                  radius={14}
                  ariaLabel={`${savedLocation.name} 위치 지도`}
                />
              ) : (
                <MapPlaceholder height={MAP_HEIGHT} message="주소를 선택하면 지도가 표시돼요" />
              )}
            </div>
          </Container>
        )}

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
              disabled={saving}
              onClick={() => nav.toast("임시저장은 준비 중이에요", "info")}
            >
              임시저장
            </Button>
            <Button
              variant="primary"
              size="lg"
              style={{ flex: 1 }}
              disabled={!valid || saving || (isEdit && status !== "ready")}
              onClick={() => void submit()}
            >
              {submitLabel}
            </Button>
          </div>
        </FixedBottom>
      </Screen>

      {pickerOpen && (
        <Overlay label="장소 선택">
          <PlacePickerScreen
            initial={location}
            onClose={() => setPickerOpen(false)}
            onConfirm={applyLocation}
          />
        </Overlay>
      )}
    </>
  );
}
