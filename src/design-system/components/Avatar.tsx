import type { CSSProperties } from "react";
import { Icon } from "../Icon";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<AvatarSize, { box: number; icon: number }> = {
  sm: { box: 32, icon: 16 },
  md: { box: 48, icon: 24 },
  lg: { box: 72, icon: 32 },
  xl: { box: 96, icon: 40 },
};

export type AvatarProps = {
  /** 없으면 기본 사용자 아이콘을 보여준다. */
  src?: string | null;
  /** 장식용이면 비워둔다. 의미가 있을 때만 이름을 넣는다. */
  alt?: string;
  size?: AvatarSize;
};

export function Avatar({ src, alt = "", size = "md" }: AvatarProps) {
  const s = SIZE[size];
  const base: CSSProperties = {
    width: s.box,
    height: s.box,
    borderRadius: "50%",
    flexShrink: 0,
    background: "var(--color-background-muted)",
  };

  if (!src) {
    return (
      <div
        aria-hidden
        style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="user" size={s.icon} color="var(--color-text-muted)" />
      </div>
    );
  }

  return (
    // 구글 아바타 CDN은 referrer가 붙으면 403을 준다.
    // next/image 를 쓰지 않는 이유: src 가 스토리지·구글·blob: 세 곳에서 온다.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} referrerPolicy="no-referrer" style={{ ...base, objectFit: "cover" }} />
  );
}
