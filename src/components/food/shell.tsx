"use client";

/**
 * Responsive app-shell primitives for the handoff.
 *
 * The Pencil design is mobile-only (360px). These helpers scale it to tablet /
 * desktop: content is centred in a `max-width` container (≤1280 for list pages),
 * card lists reflow into a responsive grid, and everything beyond the container
 * becomes left/right margin. Sticky header + fixed bottom bars stay full-bleed
 * while their content aligns to the same container.
 */

import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "@/design-system/components/IconButton";

/** Horizontal page gutter — grows 16 → 32 with the viewport. */
export const GUTTER = "clamp(16px, 4vw, 32px)";

/** Standard content width for the list-style pages (main / my). */
export const LIST_MAX = 1280;
/** Narrower reading/form width for detail / register / login. */
export const READ_MAX = 760;

export function Screen({
  children,
  background = "var(--color-background-default)",
  hasBottomBar = false,
  style,
}: {
  children: ReactNode;
  background?: string;
  hasBottomBar?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background,
        paddingBottom: hasBottomBar ? "calc(64px + env(safe-area-inset-bottom))" : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Full-bleed sticky top bar; children (a TopNavigation) align to `maxWidth`. */
export function StickyHeader({
  children,
  inverse = false,
  maxWidth = LIST_MAX,
}: {
  children: ReactNode;
  inverse?: boolean;
  maxWidth?: number;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        width: "100%",
        background: inverse
          ? "var(--color-background-inverse)"
          : "var(--color-background-default)",
      }}
    >
      <div style={{ maxWidth, margin: "0 auto", width: "100%" }}>{children}</div>
    </header>
  );
}

/** Full-bleed fixed bottom bar; children align to `maxWidth`. */
export function FixedBottom({
  children,
  maxWidth = LIST_MAX,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        width: "100%",
        background: "var(--color-background-default)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div style={{ maxWidth, margin: "0 auto", width: "100%" }}>{children}</div>
    </div>
  );
}

/** Centred content column with responsive side gutters. */
export function Container({
  children,
  maxWidth = LIST_MAX,
  style,
  padded = true,
}: {
  children: ReactNode;
  maxWidth?: number;
  style?: CSSProperties;
  padded?: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth,
        margin: "0 auto",
        boxSizing: "border-box",
        padding: padded ? `0 ${GUTTER}` : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Responsive card grid — 1 col on mobile, expanding to 2/3 up to the max. */
export function CardGrid({
  children,
  min = 320,
  gap = 12,
}: {
  children: ReactNode;
  min?: number;
  gap?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap,
        gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/** Floating action button pinned to the content container's right edge. */
export function Fab({
  onClick,
  maxWidth = LIST_MAX,
  icon = "plus",
  label = "맛집 등록",
}: {
  onClick?: () => void;
  maxWidth?: number;
  icon?: "plus";
  label?: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(76px + env(safe-area-inset-bottom))",
        right: `calc(max(0px, (100vw - ${maxWidth}px) / 2) + ${GUTTER})`,
        zIndex: 25,
      }}
    >
      <IconButton
        icon={icon}
        aria-label={label}
        variant="circle-brand"
        size={56}
        iconSize={26}
        onClick={onClick}
        style={{
          boxShadow: "0 8px 20px rgba(241, 81, 42, 0.4)",
        }}
      />
    </div>
  );
}

/** Section heading row: title on the left, optional trailing node on the right. */
export function SectionHeader({
  title,
  trailing,
}: {
  title: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span className="text-heading-sm" style={{ color: "var(--color-text-default)" }}>
        {title}
      </span>
      {trailing}
    </div>
  );
}
