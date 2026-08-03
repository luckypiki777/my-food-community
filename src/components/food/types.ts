import type { ToastType } from "@/design-system/components/Toast";

export type ScreenKey = "login" | "main" | "detail" | "register" | "my";

/** Navigation + shared-state API passed from FoodApp down to each screen. */
export type AppNav = {
  navigate: (screen: ScreenKey) => void;
  openDetail: (id: string) => void;
  toast: (message: string, type?: ToastType) => void;
  bookmarks: Set<string>;
  toggleBookmark: (id: string) => void;
};
