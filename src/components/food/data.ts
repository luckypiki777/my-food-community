/**
 * 화면 장식에만 쓰는 고정값.
 *
 * 맛집 데이터는 전부 BFF(`/api/places`)에서 온다. 목업 배열은 배선하면서 걷어냈다.
 * 여기 남은 건 아직 DB에 대응하는 값이 없는 것들뿐이다.
 */

/** 카테고리 태그는 아직 DB에 없다. 컬럼이 생기면 메인의 안내 토스트를 실제 필터로 바꾼다. */
export type CategoryKey = "all" | "kids" | "parking" | "date";

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "kids", label: "아이맛집" },
  { key: "parking", label: "주차편함" },
  { key: "date", label: "데이트" },
];

/** 메인 상단 히어로. 편집 배너라 특정 맛집과 묶여 있지 않다. */
export const FEATURED = {
  badge: "이번 주말 추천",
  title: "차로 30분, 진짜 다녀온 숨은 맛집",
  image:
    "https://images.unsplash.com/photo-1764059115796-46fcc9b842af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200",
};

export const LOGIN_HERO =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";
