"use client";

import { useState } from "react";
import { TopNavigation } from "@/design-system/components/TopNavigation";
import { TextField } from "@/design-system/components/TextField";
import { Textarea } from "@/design-system/components/Textarea";
import { Button } from "@/design-system/components/Button";
import { FileUploader, type FileItemData } from "@/design-system/components/FileUploader";
import { Icon } from "@/design-system/Icon";
import { Screen, StickyHeader, FixedBottom, Container, READ_MAX, GUTTER } from "../shell";
import type { AppNav } from "../types";

const SAMPLE_ADDRESS = "경기 광명시 오리로 854번길 12, 1층";
const REVIEW_MIN = 10;

export function RegisterScreen({ nav }: { nav: AppNav }) {
  const [photos, setPhotos] = useState<FileItemData[]>([]);
  const [name, setName] = useState("광명 시골보리밥");
  const [review, setReview] = useState("맛있어요");
  const [address, setAddress] = useState("");
  // Starts in the "error state" from the Pencil design; clears as fields are fixed.
  const [attempted, setAttempted] = useState(true);

  const photoMissing = photos.length === 0;
  const reviewShort = review.trim().length < REVIEW_MIN;
  const nameMissing = name.trim().length === 0;
  const addressMissing = address.length === 0;
  const valid = !photoMissing && !reviewShort && !nameMissing && !addressMissing;

  const addPhoto = (files: FileList) => {
    const next: FileItemData[] = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      status: "complete",
    }));
    setPhotos((p) => [...p, ...next]);
  };

  const submit = () => {
    setAttempted(true);
    if (!valid) {
      nav.toast("필수 항목을 확인해 주세요", "error");
      return;
    }
    nav.toast("맛집을 등록했어요", "success");
    nav.navigate("main");
  };

  return (
    <Screen hasBottomBar>
      <StickyHeader inverse maxWidth={READ_MAX}>
        <TopNavigation
          variant="inverse"
          title="맛집 등록"
          leftIcon="arrow-left"
          onLeftClick={() => nav.navigate("main")}
        />
      </StickyHeader>

      <Container maxWidth={READ_MAX} style={{ paddingTop: 16, paddingBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {attempted && !valid && (
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
                  사진, 설명, 주소를 확인해 주세요.
                </span>
              </div>
            </div>
          )}

          <FileUploader
            helperText="사진 추가 · 대표 사진 1장은 꼭 필요해요"
            selectLabel="사진 선택"
            error={attempted && photoMissing}
            items={photos}
            onSelect={addPhoto}
            onRemove={(id) => setPhotos((p) => p.filter((f) => f.id !== id))}
          />

          <TextField
            label="맛집 이름"
            placeholder="맛집 이름을 입력해 주세요"
            size="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Textarea
            label="어떤 곳인가요?"
            placeholder="어떤 점이 좋았는지 알려 주세요"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            maxLength={200}
            showCounter
            helperText={`최소 ${REVIEW_MIN}자 이상 입력해 주세요`}
            errorMessage={
              attempted && reviewShort ? "후기는 10자 이상 입력해 주세요." : undefined
            }
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="text-label-lg" style={{ color: "var(--color-text-secondary)" }}>
              주소
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <TextField
                placeholder="주소를 검색해 주세요"
                size="lg"
                value={address}
                readOnly
                style={{ flex: 1 }}
              />
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setAddress(SAMPLE_ADDRESS);
                  nav.toast("주소를 선택했어요", "success");
                }}
              >
                검색
              </Button>
            </div>
            {attempted && addressMissing && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="error" size={16} color="var(--color-text-error)" />
                <span className="text-label-md" style={{ color: "var(--color-text-error)" }}>
                  주소 선택 후 지도를 확인해 주세요.
                </span>
              </div>
            )}
          </div>

          <AddressMap address={address} />
        </div>
      </Container>

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
            onClick={() => nav.toast("임시저장했어요", "info")}
          >
            임시저장
          </Button>
          <Button
            variant="primary"
            size="lg"
            style={{ flex: 1 }}
            disabled={!valid}
            onClick={submit}
          >
            {valid ? "맛집 등록" : "필수 항목 확인"}
          </Button>
        </div>
      </FixedBottom>
    </Screen>
  );
}

function AddressMap({ address }: { address: string }) {
  if (!address) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: 120,
          borderRadius: 14,
          background: "var(--color-background-muted)",
        }}
      >
        <Icon name="image" size={24} color="var(--color-text-muted)" />
        <span className="text-body-md" style={{ color: "var(--color-text-muted)" }}>
          주소를 선택하면 지도가 표시돼요
        </span>
      </div>
    );
  }
  return (
    <div
      style={{
        position: "relative",
        height: 120,
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--color-background-muted)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 40,
          height: 40,
          borderRadius: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background-brand)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        }}
      >
        <Icon name="map-pin" size={20} color="var(--color-text-on-brand)" />
      </div>
    </div>
  );
}
