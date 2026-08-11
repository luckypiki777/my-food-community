"use client";

import { Icon } from "@/design-system/Icon";
import { placeMeta, type PlaceSummary } from "./usePlaces";

export function RestaurantCard({
  place,
  bookmarked = false,
  onToggleBookmark,
  onClick,
  onDelete,
}: {
  place: PlaceSummary;
  bookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  onClick?: (id: string) => void;
  /** 넘기면 찜 대신 삭제(X) 버튼이 붙는다. 마이페이지의 "내가 쓴 글" 에서만 쓴다. */
  onDelete?: (id: string) => void;
}) {
  // 찜 목록은 화면 상태라 문자열 키를 쓴다. DB의 id 는 숫자다.
  const key = String(place.id);

  return (
    <div
      onClick={() => onClick?.(key)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(key);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 10,
        borderRadius: 16,
        background: "var(--color-background-surface)",
        border: "1px solid var(--color-border-subtle)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <Thumbnail url={place.thumbnailUrl} alt={place.title} count={place.imageCount} />

      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 0 }}>
        <span
          className="text-heading-sm"
          style={{
            color: "var(--color-text-default)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {place.title}
        </span>
        <span
          className="text-label-md"
          style={{
            color: "var(--color-text-muted)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {place.content}
        </span>
        <span className="text-label-md" style={{ color: "var(--color-text-subtle)" }}>
          {placeMeta(place)}
        </span>
      </div>

      <button
        type="button"
        aria-label={onDelete ? `${place.title} 삭제` : bookmarked ? "찜 해제" : "찜하기"}
        aria-pressed={onDelete ? undefined : bookmarked}
        onClick={(e) => {
          // 카드 전체가 상세로 가는 버튼이라 여기서 멈추지 않으면 같이 눌린다.
          e.stopPropagation();
          if (onDelete) onDelete(key);
          else onToggleBookmark?.(key);
        }}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          flexShrink: 0,
          border: "none",
          background: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        {onDelete ? (
          <Icon name="close" size={20} color="var(--color-text-subtle)" />
        ) : (
          <Icon
            name="bookmark"
            size={20}
            color={bookmarked ? "var(--color-text-brand)" : "var(--color-text-subtle)"}
            fill={bookmarked ? "var(--color-brand-600)" : "none"}
          />
        )}
      </button>
    </div>
  );
}

/** 사진은 서버가 1장 이상을 보장하지만, 로딩 실패까지 감안해 빈 상태를 그린다. */
function Thumbnail({ url, alt, count }: { url: string | null; alt: string; count: number }) {
  const box = {
    position: "relative" as const,
    width: 84,
    height: 84,
    flexShrink: 0,
    borderRadius: 12,
    overflow: "hidden",
    background: "var(--color-background-muted)",
  };

  if (!url) {
    return (
      <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="image" size={20} color="var(--color-text-muted)" />
      </div>
    );
  }

  return (
    <div style={box}>
      <img
        src={url}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {count > 1 && (
        <span
          className="text-label-md"
          style={{
            position: "absolute",
            right: 4,
            bottom: 4,
            padding: "1px 6px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.45)",
            color: "var(--color-text-on-inverse)",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
