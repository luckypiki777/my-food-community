import type { BottomNavItem } from "@/design-system/components/BottomNavigation";

/** Bottom navigation shared by the main + my pages (matches the Pencil design). */
export const MAIN_BOTTOM_NAV: BottomNavItem[] = [
  { key: "home", icon: "home", label: "홈" },
  { key: "map", icon: "map-pin", label: "지도" },
  { key: "register", icon: "plus", label: "등록" },
  { key: "my", icon: "user", label: "마이" },
];
