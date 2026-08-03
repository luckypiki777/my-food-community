@AGENTS.md

# Design SSOT

- Storybook을 디자인 SSOT로 취급한다.
- 컴포넌트: `src/design-system/components/*` (스토리: `*.stories.tsx`)
- 토큰: `src/design-system/tokens.ts`, 아이콘: `src/design-system/Icon.tsx`
- 파운데이션 스토리: `src/design-system/{Colors,Typography,Iconography}.stories.tsx`
- Storybook 설정: `.storybook/`
- 모든 UI 작업 시 위 컴포넌트/토큰을 가져다 재사용한다.
- 없는 UI가 필요하면 먼저 스토리를 추가한 뒤 사용한다.

# 반응형 (핸드오프)

- 셸 프리미티브 재사용: `src/components/food/shell.tsx`
- 리스트형(메인·마이): 컨테이너 max-width `1280`, 카드 그리드 `repeat(auto-fill, minmax(320px, 1fr))`, gap `12`.
- 읽기·폼형(상세·등록): max-width `760`. 로그인: max-width `480`.
- 컨테이너 중앙 정렬, 좌우 패딩 `clamp(16px, 4vw, 32px)`, 초과분은 좌우 여백.
- sticky 톱바·fixed 하단바: 풀블리드 배경 + 내부 콘텐츠는 컨테이너 폭에 정렬.
- FAB: 컨테이너 우측 끝에 정렬.
