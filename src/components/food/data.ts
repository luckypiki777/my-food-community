import type { IconName } from "@/design-system/tokens";

/** A discoverable restaurant. Content mirrors the Pencil hi-fi design. */
export type Restaurant = {
  id: string;
  name: string;
  /** short "한식 · 보리밥 · 3월 등록" meta line */
  meta: string;
  /** one-line card description */
  description: string;
  /** thumbnail / hero image url */
  image: string;
  /** category chips used by the main-page filter */
  tags: CategoryKey[];
  /** detail-page info chips */
  info: { icon: IconName; label: string }[];
  /** long review body on the detail page */
  review: string;
  address: string;
};

export type CategoryKey = "all" | "kids" | "parking" | "date";

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "kids", label: "아이맛집" },
  { key: "parking", label: "주차편함" },
  { key: "date", label: "데이트" },
];

const HERO =
  "https://images.unsplash.com/photo-1728657824943-8ef95b197b98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";

export const RESTAURANTS: Restaurant[] = [
  {
    id: "guro-boribap",
    name: "광명 시골보리밥",
    meta: "한식 · 보리밥 · 3월 등록",
    description: "정갈한 반찬에 넉넉한 주차, 아이랑 가기 좋아요",
    image: "/images/detail-hero.png",
    tags: ["kids", "parking"],
    info: [
      { icon: "info", label: "주차 넉넉" },
      { icon: "user", label: "아이 의자" },
      { icon: "home", label: "차로 24분" },
    ],
    review:
      "주말 점심에 다녀왔는데 보리밥 정식이 정갈하고 반찬이 계속 손이 갔어요. 좌석이 넓어서 아이랑 가도 부담 없고, 근처 공영주차장도 가까워요. 붐비지 않아서 여유롭게 먹고 왔습니다.",
    address: "경기 광명시 오리로 854번길 12, 1층",
  },
  {
    id: "maechom-bibim",
    name: "매콤 비빔국수",
    meta: "분식 · 국수 · 5월 등록",
    description: "새콤달콤 매콤한 양념 비빔국수 전문",
    image:
      "https://images.unsplash.com/photo-1728657824943-8ef95b197b98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    tags: ["date"],
    info: [
      { icon: "info", label: "혼밥 가능" },
      { icon: "star", label: "웨이팅 짧음" },
    ],
    review:
      "양념이 새콤달콤 매콤해서 계속 생각나는 비빔국수예요. 면발이 쫄깃하고 양도 넉넉합니다. 점심때는 조금 붐비지만 회전이 빨라 오래 기다리진 않았어요.",
    address: "서울 구로구 구로중앙로 152",
  },
  {
    id: "siheung-kalguksu",
    name: "시흥 손칼국수",
    meta: "한식 · 칼국수 · 2월 등록",
    description: "손으로 뽑은 면발의 진한 손칼국수",
    image:
      "https://images.unsplash.com/photo-1572268152063-4a744292db1b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    tags: ["parking"],
    info: [
      { icon: "info", label: "주차 가능" },
      { icon: "star", label: "국물 진함" },
    ],
    review:
      "손으로 직접 뽑은 면발이 쫄깃하고 국물이 진해요. 붐비지 않는 시간대에 가면 여유롭게 먹을 수 있습니다. 겉절이가 특히 맛있었어요.",
    address: "경기 시흥시 은행로 45",
  },
  {
    id: "mullae-hwadeok",
    name: "문래 작은 화덕",
    meta: "양식 · 피자 · 4월 등록",
    description: "장작 화덕에 구운 담백한 화덕피자",
    image:
      "https://images.unsplash.com/photo-1716237387585-04dfe90040dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    tags: ["date", "kids"],
    info: [
      { icon: "info", label: "예약 가능" },
      { icon: "user", label: "아이 환영" },
    ],
    review:
      "장작 화덕에 구워 도우가 담백하고 쫄깃해요. 작은 가게라 아늑하고 데이트하기도 좋습니다. 마르게리타가 특히 훌륭했어요.",
    address: "서울 영등포구 문래로 63",
  },
  {
    id: "gaebong-cafe",
    name: "개봉 골목 브런치",
    meta: "카페 · 브런치 · 6월 등록",
    description: "조용한 골목의 햇살 좋은 브런치 카페",
    image: "/samples/food-1.png",
    tags: ["date"],
    info: [
      { icon: "info", label: "노트북 가능" },
      { icon: "star", label: "디저트 맛집" },
    ],
    review:
      "골목 안쪽 조용한 카페인데 햇살이 잘 들어와요. 브런치 플레이트가 정갈하고 커피도 향이 좋습니다. 주말 오전에 특히 여유로워요.",
    address: "서울 구로구 개봉로 118",
  },
  {
    id: "guro-mandu",
    name: "구로 옛날 손만두",
    meta: "분식 · 만두 · 1월 등록",
    description: "매일 아침 빚는 김치·고기 손만두",
    image: "/samples/food-2.png",
    tags: ["kids", "parking"],
    info: [
      { icon: "info", label: "포장 가능" },
      { icon: "user", label: "가족 외식" },
    ],
    review:
      "매일 아침 직접 빚는 손만두라 속이 꽉 차 있어요. 김치만두와 고기만두 둘 다 훌륭하고, 아이들도 잘 먹었습니다. 포장 손님도 많아요.",
    address: "서울 구로구 가마산로 268",
  },
];

export const FEATURED = {
  badge: "이번 주말 추천",
  title: "차로 30분, 진짜 다녀온 숨은 맛집",
  image:
    "https://images.unsplash.com/photo-1764059115796-46fcc9b842af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200",
  total: 5,
};

export const LOGIN_HERO =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

export const PROFILE = {
  nickname: "구로댁",
  email: "guro.mom@gmail.com",
  avatar:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
  stats: [
    { value: 12, label: "작성한 글" },
    { value: 34, label: "저장한 곳" },
    { value: 8, label: "이번 달 방문" },
  ],
};

/** The card lists shown on the main + my pages (by restaurant id). */
export const MAIN_LIST_IDS = [
  "maechom-bibim",
  "siheung-kalguksu",
  "mullae-hwadeok",
  "guro-boribap",
  "gaebong-cafe",
  "guro-mandu",
];

export const MY_POST_IDS = ["guro-boribap", "mullae-hwadeok", "siheung-kalguksu"];

export const FEATURED_HERO_FALLBACK = HERO;

export function getRestaurant(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}
