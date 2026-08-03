/**
 * Design token metadata — mirrors design.pen (Pencil variables).
 * Values themselves live as CSS variables in src/app/globals.css.
 * This module carries the *structure* (names, references) used by the
 * Storybook foundation stories.
 */

/* ---------------------------------------------------------------- Colors -- */

export const SHADES = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export type PaletteKey = "brand" | "neutral" | "red" | "green" | "amber" | "blue";

export const PRIMITIVE_PALETTES: { key: PaletteKey; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "neutral", label: "Neutral" },
  { key: "red", label: "Red · Error" },
  { key: "green", label: "Green · Success" },
  { key: "amber", label: "Amber · Warning" },
  { key: "blue", label: "Blue · Info" },
];

export type SemanticToken = { token: string; ref: string };

export const SEMANTIC_TEXT: SemanticToken[] = [
  { token: "color-text-default", ref: "neutral-900" },
  { token: "color-text-secondary", ref: "neutral-700" },
  { token: "color-text-subtle", ref: "neutral-600" },
  { token: "color-text-muted", ref: "neutral-400" },
  { token: "color-text-brand", ref: "brand-600" },
  { token: "color-text-on-brand", ref: "neutral-50" },
  { token: "color-text-on-inverse", ref: "neutral-50" },
  { token: "color-text-error", ref: "red-600" },
  { token: "color-text-success", ref: "green-700" },
  { token: "color-text-warning", ref: "amber-700" },
  { token: "color-text-info", ref: "blue-700" },
];

export const SEMANTIC_BACKGROUND: SemanticToken[] = [
  { token: "color-background-default", ref: "neutral-50" },
  { token: "color-background-surface", ref: "neutral-50" },
  { token: "color-background-subtle", ref: "neutral-100" },
  { token: "color-background-muted", ref: "neutral-100" },
  { token: "color-background-inverse", ref: "neutral-900" },
  { token: "color-background-brand", ref: "brand-600" },
  { token: "color-background-brand-subtle", ref: "brand-50" },
  { token: "color-background-error", ref: "red-600" },
  { token: "color-background-error-subtle", ref: "red-50" },
  { token: "color-background-success-subtle", ref: "green-50" },
  { token: "color-background-warning-subtle", ref: "amber-50" },
  { token: "color-background-info-subtle", ref: "blue-50" },
];

export const SEMANTIC_BORDER: SemanticToken[] = [
  { token: "color-border-default", ref: "neutral-200" },
  { token: "color-border-strong", ref: "neutral-300" },
  { token: "color-border-subtle", ref: "neutral-100" },
  { token: "color-border-brand", ref: "brand-500" },
  { token: "color-border-error", ref: "red-500" },
  { token: "color-border-error-subtle", ref: "red-200" },
  { token: "color-border-success", ref: "green-500" },
  { token: "color-border-warning", ref: "amber-500" },
  { token: "color-border-info", ref: "blue-500" },
];

/* ------------------------------------------------------------ Typography -- */

export type TypeStyle = {
  /** design-system class name, e.g. "text-display-lg" */
  name: string;
  fontSize: number;
  sizeToken: string;
  weight: number;
  weightLabel: "Bold" | "SemiBold" | "Regular";
  lineHeight: number;
  lineHeightLabel: "tight" | "normal";
};

export const TYPE_STYLES: TypeStyle[] = [
  { name: "text-display-lg", fontSize: 36, sizeToken: "font-size-800", weight: 700, weightLabel: "Bold", lineHeight: 1.2, lineHeightLabel: "tight" },
  { name: "text-display-md", fontSize: 32, sizeToken: "font-size-700", weight: 700, weightLabel: "Bold", lineHeight: 1.2, lineHeightLabel: "tight" },
  { name: "text-display-sm", fontSize: 28, sizeToken: "font-size-600", weight: 700, weightLabel: "Bold", lineHeight: 1.2, lineHeightLabel: "tight" },
  { name: "text-heading-lg", fontSize: 24, sizeToken: "font-size-500", weight: 700, weightLabel: "Bold", lineHeight: 1.2, lineHeightLabel: "tight" },
  { name: "text-heading-md", fontSize: 20, sizeToken: "font-size-400", weight: 700, weightLabel: "Bold", lineHeight: 1.2, lineHeightLabel: "tight" },
  { name: "text-heading-sm", fontSize: 16, sizeToken: "font-size-300", weight: 600, weightLabel: "SemiBold", lineHeight: 1.2, lineHeightLabel: "tight" },
  { name: "text-body-lg", fontSize: 16, sizeToken: "font-size-300", weight: 400, weightLabel: "Regular", lineHeight: 1.4, lineHeightLabel: "normal" },
  { name: "text-body-md", fontSize: 14, sizeToken: "font-size-200", weight: 400, weightLabel: "Regular", lineHeight: 1.4, lineHeightLabel: "normal" },
  { name: "text-label-lg", fontSize: 14, sizeToken: "font-size-200", weight: 600, weightLabel: "SemiBold", lineHeight: 1.4, lineHeightLabel: "normal" },
  { name: "text-label-md", fontSize: 12, sizeToken: "font-size-100", weight: 400, weightLabel: "Regular", lineHeight: 1.4, lineHeightLabel: "normal" },
];

/* ----------------------------------------------------------- Iconography -- */

/** Icon set (Lucide). Order follows the iconography spec. */
export const ICON_NAMES = [
  "arrow-left", "arrow-right", "arrow-up", "arrow-down",
  "chevron-left", "chevron-right", "chevron-up", "chevron-down",
  "home", "map-pin", "calendar", "copy", "refresh", "logout", "close", "menu",
  "search", "filter", "sort", "plus", "edit", "delete", "bookmark",
  "share", "more-horizontal", "more-vertical", "check", "info",
  "warning", "error", "user", "settings", "notification", "heart",
  "star", "comment", "image",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const ICON_SIZES = [16, 20, 24, 32] as const;
export type IconSize = (typeof ICON_SIZES)[number];
