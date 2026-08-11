import type { ToastType } from "@/design-system/components/Toast";
import type { SessionUser } from "./useSession";
import type { Profile, ProfileSaveInput, ProfileSaveResult } from "./useProfile";
import type { LoadStatus, PlaceSummary } from "./usePlaces";

export type ScreenKey = "login" | "main" | "detail" | "register" | "edit" | "my";

/** Navigation + shared-state API passed from FoodApp down to each screen. */
export type AppNav = {
  navigate: (screen: ScreenKey) => void;
  openDetail: (id: string) => void;
  /** 수정 화면으로. 내가 쓴 글에서만 호출한다. */
  openEdit: (id: string) => void;
  toast: (message: string, type?: ToastType) => void;
  bookmarks: Set<string>;
  toggleBookmark: (id: string) => void;
  /** 로그인한 사용자. 로그인 화면에서는 null. */
  user: SessionUser | null;
  /** 우리 DB의 프로필(닉네임·사진). 아직 못 불러왔으면 null. */
  profile: Profile | null;
  /** 프로필을 BFF로 저장하고 최신 값으로 갱신한다. */
  saveProfile: (input: ProfileSaveInput) => Promise<ProfileSaveResult>;
  /** BFF로 로그아웃하고 로그인 화면으로 돌려보낸다. */
  signOut: () => void;
  /** 맛집 목록. 메인과 마이 화면이 한 번 불러온 결과를 나눠 쓴다. */
  places: PlaceSummary[];
  placesStatus: LoadStatus;
  /** 등록·수정 후 목록을 다시 불러온다. */
  reloadPlaces: () => void;
  loadMorePlaces: () => void;
  loadingMorePlaces: boolean;
  hasMorePlaces: boolean;
};
