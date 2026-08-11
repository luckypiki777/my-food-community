"use client";

/**
 * 지도 자리의 빈 상태.
 *
 * 실제 지도는 `NaverMap` 이다. 여기는 그릴 지도가 없을 때 자리를 지킨다 —
 * 아직 위치를 고르지 않았거나(등록 화면), 키가 없거나 인증이 깨져 지도를 못 띄웠을 때다.
 *
 * 예전에는 정적 지도 이미지를 얹는 `MapPreview` 도 같이 있었다. 상세 화면이 좌표 없이
 * 지도 자리를 채우려고 쓰던 것인데, 이제 좌표를 저장하므로 상세도 `NaverMap` 을 쓴다.
 */

import { Icon } from "@/design-system/Icon";

/** 아직 고른 장소가 없을 때 지도 자리에 들어가는 안내. */
export function MapPlaceholder({
  height,
  message,
  radius = 14,
}: {
  height: string | number;
  message: string;
  radius?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height,
        borderRadius: radius,
        background: "var(--color-background-muted)",
      }}
    >
      <Icon name="image" size={24} color="var(--color-text-muted)" />
      <span className="text-body-md" style={{ color: "var(--color-text-muted)" }}>
        {message}
      </span>
    </div>
  );
}
