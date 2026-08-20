import type { ToastType } from "@/design-system/components/Toast";
import type { SessionUser } from "./useSession";
import type { Profile, ProfileSaveInput, ProfileSaveResult } from "./useProfile";
import type { LoadStatus, PlaceSummary } from "./usePlaces";
import type { Cancellation, Order, Receipt } from "./payments";
import type { CancelResult } from "./usePayments";

export type ScreenKey =
  | "login"
  | "main"
  | "detail"
  | "register"
  | "edit"
  | "my"
  | "banner"
  | "payment-complete";

/** 마이 화면의 탭. 결제 완료 화면에서 "결제 내역 보기" 로 바로 열기도 한다. */
export type MyTabKey = "posts" | "orders" | "cancels";

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

  /* ------------------------------------------------- 강연·모임 결제 (배너) -- */

  /** 메인 배너에서 상품 상세로. */
  openBanner: (productId: string) => void;
  /** 결제가 끝났다. 내역을 다시 읽고 완료 화면으로 보낸다. */
  completePayment: (receipt: Receipt) => void;
  /**
   * 결제를 취소한다. BFF 가 포트원 취소를 부르고 원장에 취소 행을 쌓는다.
   * 성공하면 결제 내역에서 빠지고 취소 내역으로 옮겨간다.
   */
  cancelOrder: (orderId: string) => Promise<CancelResult>;
  orders: Order[];
  cancellations: Cancellation[];
  /** 결제·취소 내역을 불러오는 중인지. 두 탭이 같이 쓴다. */
  paymentsStatus: LoadStatus;
  /** 상한을 넘긴 오래된 결제가 더 있는지. 있으면 안내 한 줄을 붙인다. */
  paymentsHasMore: boolean;
  /** 마이 화면에서 지금 열려 있는 탭. */
  myTab: MyTabKey;
  /** 마이 화면을 특정 탭으로 연다. 이미 마이에 있으면 탭만 바꾼다. */
  openMyTab: (tab: MyTabKey) => void;
};
