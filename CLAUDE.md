@AGENTS.md
@rules/payment.md

# Design SSOT

- Storybook을 디자인 SSOT로 취급한다.
- 컴포넌트: `src/design-system/components/*` (스토리: `*.stories.tsx`)
- 토큰: `src/design-system/tokens.ts`, 아이콘: `src/design-system/Icon.tsx`
- 파운데이션 스토리: `src/design-system/{Colors,Typography,Iconography}.stories.tsx`
- Storybook 설정: `.storybook/`
- 모든 UI 작업 시 위 컴포넌트/토큰을 가져다 재사용한다.
- 없는 UI가 필요하면 먼저 스토리를 추가한 뒤 사용한다.

# 데이터 접근 (BFF)

- **모든 Supabase 접근은 Next.js BFF를 통한다.** 브라우저에서 Supabase로 직접 요청하지 않는다.
- 클라이언트 컴포넌트는 자체 API(`/api/*`)만 호출한다. `supabase-js` 클라이언트를 import 하지 않는다.
- BFF 계층: `src/app/api/**/route.ts` (Route Handler) 또는 Server Action. 서버 전용 코드에서만 Supabase SDK를 사용한다.
- Supabase 클라이언트 생성은 `src/lib/supabase/server.ts` 한 곳으로 모으고, 파일 최상단에 `import 'server-only'`을 둔다.
- Service role key 등 비밀 키는 서버에서만 읽는다. `NEXT_PUBLIC_*` 로 노출하지 않는다.
- **RLS 를 우회하는 secret 키(`SUPABASE_SECRET_KEY`)를 쓰는 곳은 결제 웹훅 하나뿐이다.**
  세션이 없는 요청(포트원이 부른다)이라 다른 방법이 없다. 다른 라우트로 넓히지 않는다.
- BFF는 얇게 유지한다: 입력 검증 → 인가 확인 → Supabase 호출 → UI가 쓰는 형태로 응답 정규화.
- 에러는 그대로 흘리지 않는다. Supabase 에러를 `{ error: { code, message } }` 형태로 매핑하고 적절한 HTTP 상태코드를 반환한다.
- 소셜 로그인: OAuth 콜백/세션 쿠키 처리도 서버 라우트에서 수행하고, 클라이언트는 BFF가 내려준 세션 상태만 사용한다.
- BFF를 우회했다고 해서 RLS를 생략하지 않는다. 테이블 RLS는 항상 켜둔다.

## 현재 배선

- 환경변수: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_STORAGE_URL`
  (`.env.local`, 예시는 `.env.example`).
  브라우저가 Supabase를 직접 부르지 않으므로 `NEXT_PUBLIC_` 접두사를 쓰지 않는다.
  `requireEnv()` 는 `src/lib/env.ts` 에 있다.
- 클라이언트 팩토리: `src/lib/supabase/server.ts`
  - `createSupabaseServerClient()` — Route Handler / Server Action 용
  - `createSupabaseProxyClient(request)` — `src/proxy.ts` 전용
  - `createSupabaseAdminClient()` — **RLS 를 우회한다. 결제 웹훅 전용.** 다른 데서 쓰지 않는다
  - `getAuthenticatedIdentity(client?)` — 인가 게이트. 새 BFF 라우트는 여기서 시작한다.
    ID만 필요하면 `getAuthenticatedUserId(client?)`. 이미 만든 클라이언트는 넘겨서 재사용한다.
- 응답 규약: `src/lib/bff/response.ts` 의 `ok` / `noContent` / `fail` / `unauthorized` /
  `badRequest` / `fromSupabaseError` 를 쓴다. 직접 `Response.json` 하지 않는다.
- 리다이렉트 안전장치: `src/lib/bff/redirect.ts` 의 `safeNextPath` 로 오픈 리다이렉트를 막는다.
- 세션 갱신은 `src/proxy.ts` 가 담당한다. Next 16에서 `middleware.ts` 는 `proxy.ts` 로 이름이 바뀌었다.
- 인가 판단에는 `getClaims()` 만 쓴다. `getSession()` 은 쿠키를 그대로 믿으므로 서버에서 쓰지 않는다.
- 인증 라우트: `/api/auth/login` (GET, OAuth 시작) · `/api/auth/callback` (GET, 코드 교환) ·
  `/api/auth/session` (GET) · `/api/auth/logout` (POST).
- 프로필 라우트: `/api/profile` — `GET`(조회, 없으면 구글 계정으로 생성) ·
  `PATCH`(닉네임·사진 수정, `multipart/form-data`: `nickname` / `image` / `remove_image`).
- 맛집 라우트: `/api/places` — `GET`(목록) · `POST`(등록) ·
  `/api/places/[id]` — `GET`(상세) · `PATCH`(수정) · `DELETE`(소프트 삭제).
  공용 로직은 `src/lib/bff/place.ts`. 등록·수정에는 지도 정보가 **필수**다(아래 "맛집" 참고).
- 상품 라우트: `/api/products` — `GET`(목록) · `/api/products/[id]` — `GET`(상세).
  공용 로직은 `src/lib/bff/product.ts`. **조회만 있다** — 상품은 운영자가 대시보드로 넣는다
  (아래 "상품" 참고).
- 결제 라우트: `/api/payments/config` — `GET`(결제창 키) · `/api/payments/complete` — `POST`
  (결제 완료 처리 · 멱등) · `/api/payments/webhook` — `POST`(포트원 웹훅 · **로그인 게이트
  없음**, 서명으로 검증한다). 공용 로직은 `src/lib/bff/payment.ts` 와
  `src/lib/bff/paymentWebhook.ts`.
  **규칙의 원본은 `rules/payment.md` 다** — 결제 관련 작업은 거기부터 읽는다.
- 지도 라우트: `/api/map/config` — `GET`. 지도 SDK 키만 내려준다. Supabase 를 타지 않는
  유일한 라우트다(아래 "장소 선택 · 지도" 참고).
- 리버스 지오코딩 라우트: `/api/map/reverse-geocode` — `GET ?lat=&lng=`. 좌표의 지번 주소를
  읽어 준다. 로직은 `src/lib/bff/reverseGeocode.ts`. Supabase 는 로그인 게이트로만 탄다.
- 장소 검색 라우트: `/api/places/search` — `GET ?query=`. 네이버 지역 검색을 대신 부른다.
  로직은 `src/lib/bff/placeSearch.ts`. 이것도 Supabase 를 타지 않지만 로그인 게이트는 있다.
- DB 타입: `src/lib/supabase/database.types.ts`. 스키마를 바꾸면 다시 생성한다.

## 맛집 (`place` / `place_image`)

- 등록·수정은 파일이 섞이므로 `multipart/form-data`. 필드는
  `title` · `content` · `images`(여러 장) · `remove_image_ids`(수정 전용) ·
  지도 정보 `address`(지번 주소) · `name`(장소명) · `lat` · `lng`.
- 검증 규칙은 `src/lib/bff/place.ts` 의 상수와 DB 체크 제약
  (`place_title_length` / `place_content_length` / `place_address_length` /
  `place_name_length` / `place_lat_range` / `place_lng_range`)이 **같은 값**이다.
  한쪽만 바꾸면 안 된다.
  제목 1~100자, 내용 10~2000자, 주소 1~200자, 장소명 1~100자 — 모두 앞뒤 공백을 뺀 길이 기준.
  좌표는 위도 -90~90 · 경도 -180~180.
- 사진은 **최소 1장**. 수정에서도 지우고 더한 뒤 1장 이상이어야 한다.
- **지도 정보(`address`·`name`·`lat`·`lng`)는 필수이고 한 덩어리다.** 등록은 넷 다 받고,
  수정은 넷이 다 오거나 하나도 안 오거나다(`parseOptionalLocation()`). 일부만 받아 주면
  화면에 보이는 주소와 지도에 찍히는 핀이 다른 곳을 가리키게 된다.
  DB 도 같은 규칙이다 — `name`/`lat`/`lng` 는 NOT NULL 이고 `address` 의 기본값
  `'등록 대기중'` 은 걷어냈다(마이그레이션 `place_map_location_required`).
- `place.name`(지도에서 고른 상호)과 `place.title`(글 제목)은 **다른 값**이다.
  검색으로 고르면 상호가, 지도만 끌어 고르면 주소 문구가 `name` 에 들어간다.
- 좌표는 문자열로 실려 온다. `parseCoordinate()` 가 빈 문자열을 **먼저** 끊는다 —
  `Number("")` 은 `0` 이라 그냥 두면 빈 값이 적도 한복판(0, 0)으로 저장된다.
- 목록은 키셋 페이지네이션이다. `?limit=`(기본 20, 최대 50) · `?cursor=`(직전 페이지 마지막 id) ·
  `?mine=1`(내가 쓴 글만).
  OFFSET 은 뒤로 갈수록 느려지고, 넘기는 사이 새 글이 올라오면 중복·누락이 생긴다.
  "내가 쓴 글" 필터는 **서버가** 한다. 받아온 페이지만 걸러내면 뒷 페이지의 내 글이 빠진다.
- 등록 순서(글 → 업로드 → 사진 행 → 되돌리기)는 `insertPlaceWithImages()` 한 곳에만 있다.
  `POST /api/places` 와 개발용 시드가 같이 쓴다. 새 진입점을 만들어도 이걸 거쳐야 한다.
- 개발용 시드: `POST /api/dev/seed` (운영에서는 404, 로그인 필요, 이미 글이 있으면 건너뜀).
  핸드오프 목업이던 맛집 6개를 실제 DB로 넣는다. 다 쓰면 폴더째 지워도 된다.
- 화면 쪽 데이터 훅은 `src/components/food/usePlaces.ts` 다
  (`usePlaceList` / `usePlaceDetail` / `createPlace` / `updatePlace`).
  검증 상수는 BFF 와 같은 값을 `RegisterScreen` 이 복제해 두고 먼저 걸러 왕복을 아낀다.
  최종 판정은 항상 서버다 — 에러 문구도 서버가 준 걸 그대로 보여준다.
- 사진 순서는 `place_image.sort_order` 로만 정한다. `id` 는 uuid 라 정렬 기준이 못 되고
  `created_at` 은 한 번에 넣은 행끼리 값이 같다.
- `place.user_id` 의 기본값은 `auth.uid()` 다. BFF 가 명시해서 넣지만 기본값도 맞춰 둔다.
- PostgREST 호출은 한 트랜잭션으로 묶이지 않는다. 쓰기 순서를 지켜야 "사진 0장"이 안 나온다:
  글 → 업로드 → 사진 행 추가 → 사진 행 삭제 → 파일 삭제.
  **추가를 삭제보다 먼저** 하고, 실패하면 올린 파일과 글을 되돌린다.
- 작성자 정보(`profile`)는 FK 로 이어져 있지 않아 임베드가 안 된다.
  `fetchAuthors()` 로 id 를 모아 한 번에 읽는다. 행마다 조회하면 N+1 이다.

## 장소 선택 · 지도

- 화면은 **한 줄로 쌓인다**: 등록(`RegisterScreen`)의 주소 영역 → `PlacePickerScreen`(지도) →
  `PlaceSearchScreen`(검색 결과 · 결과 없음). 라우팅이 아니라 `shell.tsx` 의 `Overlay` 로
  아래 화면 **위에** 덮는다. 갈아끼우면 아래 화면이 언마운트돼 등록 폼의 사진·이름·후기가,
  검색에서 돌아왔을 때는 지도 위치와 고른 주소가 날아간다.
  그래서 검색 오버레이의 주인은 등록 화면이 아니라 **`PlacePickerScreen` 자신**이다.
- 등록 화면에서 주소를 정하는 길은 장소 선택 화면 하나뿐이다(주소 칸 · "검색" · "장소 입력하기"
  가 모두 같은 곳으로 간다). 주소 문구만 따로 입력받으면 화면에 보이는 주소와 지도가 물고 있는
  좌표가 서로 다른 곳을 가리키게 된다.
- 검색 결과를 고르면 이름은 검색창에, **지번 주소**(`address`)는 주소 영역에, 좌표는 지도
  중심에 들어간다. 결과가 없어 이름만 직접 입력한 경우에는 **이름만** 받는다 — 주소·좌표는
  그대로 두고 사용자가 지도를 끌어 맞춘다(`nameSource` 가 이 둘을 구분한다. 검색으로 고른
  이름은 지도를 끌면 더 이상 그 가게가 아니라 버리지만, 직접 입력한 이름은 남겨야 한다).
- 지도는 **네이버 지도 JS API v3** 이다. 컴포넌트 `src/components/food/NaverMap.tsx`,
  로더·타입은 `src/components/food/naverMaps.ts`. 주소 조회는 여기 없다 — 아래 참고.
- 핀은 마커가 아니라 **컨테이너 정중앙에 고정된 DOM** 이다. 그래서 지도를 끌면 지도만 흐르고
  핀은 제자리에 남는다 — 고른 좌표는 언제나 지도 중심(`getCenter()`)이다. 마커로 바꾸면
  드래그 중에 핀이 같이 밀려서 "중심을 고른다" 는 감각이 깨진다.
- 좌표를 읽는 이벤트는 `idle` 이다. `center_changed` 는 드래그 내내 쏟아져서 그때마다
  리버스 지오코딩을 부르면 호출 한도부터 바닥난다.
- 기본 위치는 구로디지털단지역(`GURO_DIGITAL_STATION`). 구로 맛집이라 늘 여기서 시작한다.
- 스크립트 파라미터는 `ncpKeyId` 다. 웹에 널려 있는 옛 예제의 `ncpClientId` 로 부르면
  인증이 실패한다. `submodules=geocoder` 는 **붙이지 않는다** — 주소는 아래처럼 BFF 가
  REST 로 읽으므로 쓸 데가 없고, 서브모듈은 `maps.js` 뒤에 따로 받아져서(실측 304ms →
  357ms) 로드 직후엔 잠깐 undefined 인 함정까지 딸려 온다.
- 주소 조회는 **리버스 지오코딩 REST API** 다(`maps.apigw.ntruss.com/map-reversegeocode/v2/gc`,
  헤더 `x-ncp-apigw-api-key-id` / `x-ncp-apigw-api-key`). 지도 SDK 와 달리 서버에서 부를 수
  있고 Key(시크릿)까지 필요하므로 규약대로 BFF(`/api/map/reverse-geocode`)가 부른다.
  화면 쪽은 `src/components/food/reverseGeocode.ts` 의 `reverseGeocode` 하나만 안다.
  문서: https://api.ncloud-docs.com/docs/application-maps-reversegeocoding
- `orders=addr`(지번)만 받는다. `output=json` 을 빼면 **XML** 이 온다(기본값이 xml 이다).
  `coords` 는 **경도,위도** 순이다 — 뒤집으면 대개 바다 주소가 온다.
- 이 API 는 완성된 주소 문자열을 주지 않는다. 행정구역(`region.area1`~`area4`)과
  번지(`land.number1`/`number2`)가 **따로** 오고, 없는 조각은 빈 문자열로 채워져 온다.
  그래서 `formatJibunAddress()` 가 빈 조각을 **걸러낸 뒤** 공백 하나로 잇는다 — 그냥 이으면
  "구로구 구로동  123-45" 처럼 공백이 겹친다. 부번(`number2`)이 없으면 `""` 나 `"0"` 으로
  오므로 본번만 쓰고, `land.type === "2"` 는 산이라 지번 앞에 "산" 을 붙인다.
- `status.code` 는 `0`(ok)·`3`(no results) 둘 다 HTTP 200 이다. `3` 은 주소가 없는 좌표
  (바다 위 등)라 오류가 아니라 `address: null` 로 내려간다.
- 키는 `NAVER_MAP_CLIENT_ID` / `NAVER_MAP_CLIENT_SECRET`(둘 다 서버 전용, 같은 NCP Maps
  애플리케이션의 짝이다). ID 는 지도 SDK 의 `ncpKeyId` 와 REST 의 Key ID 로 같이 쓰고,
  SECRET 은 REST 에서만 쓴다 — 브라우저로 나가지 않는다.
  지도 SDK 만큼은 브라우저가 직접 받아야 하지만(`<script src>` 말고 방법이 없다) 그 키도
  `NEXT_PUBLIC_` 으로 박지 않고 `/api/map/config` 가 내려준다 — 환경변수가 서버 한쪽에만
  남고, 키를 바꿔도 다시 빌드하지 않아도 된다.
  **검색·주소 조회까지 이 예외를 넓히지 말 것.** 서버에서 부를 수 있는 건 서버에서 부른다.
- 리버스 지오코딩도 호출마다 값을 치르는 API 다. 그래서 라우트에 로그인 게이트를 두고
  (우리 키로 남의 좌표를 대신 풀어 주지 않는다), 화면은 지도가 멈춘 뒤(`idle`)에만 부른다.
- 인증 실패는 스크립트 로드가 **성공한 뒤** 비동기로 온다(`window.navermap_authFailure`).
  로드 프라미스로는 못 잡으니 `subscribeAuthFailure()` 로 듣는다. 그때 SDK 는 `naver.maps` 를
  통째로 비우므로 지도 참조부터 버려야 한다 — 안 그러면 다음 effect 의 `getCenter()` 가 터지고,
  지도를 품은 등록 폼까지 같이 죽어 쓰던 사진·후기가 날아간다.
- 키가 없거나 인증이 깨져도 앱은 그대로 돈다. 지도 자리에만 `MapPlaceholder` 로 이유가 뜬다.
  `NAVER_MAP_CLIENT_SECRET` 만 없을 때는 지도는 멀쩡하고 주소 영역만 "주소를 읽지 못했어요"
  가 된다.
- 검색은 **네이버 지역 검색**이다. 지도와 달리 서버에서 부를 수 있고 Client Secret 이 필요한
  API 라, 규약대로 BFF(`/api/places/search`)가 부른다. 화면 쪽은
  `src/components/food/placeSearch.ts` 의 `searchPlaces` 하나만 안다.
- 지역 검색은 **지도와 다른 키다**(`NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET`).
  지도는 NCP Maps, 검색은 NAVER API Hub 로 서비스가 나뉘어 있다. 주소는
  `naverapihub.apigw.ntruss.com/search/v1/local`, 헤더는 `X-NCP-APIGW-API-KEY-ID` /
  `X-NCP-APIGW-API-KEY`. 옛 `openapi.naver.com/v1/search/local` 주소가 아니다.
- `display` 는 **최대 5**다. API 상한이라 한 번에 더 받을 방법이 없다.
- `mapx`/`mapy` 는 문자열이고, 문서에 "WGS84" 라고만 적혀 있지만 실제로는 **도에 10^7 을 곱한
  정수**로 온다("1269014070" = 126.9014070). `toDegrees()` 가 두 형태를 다 받아 `lng`/`lat`
  으로 바꾼다 — 화면은 좌표 변환을 모른다.
- `title` 에는 검색어와 겹치는 부분에 `<b>` 가 붙어 온다. 그대로 그리면 태그가 눈에 보인다.
  `plainText()` 가 태그와 HTML 엔티티를 풀어 준다.
- 하루 25,000건 제한이 있다. 그래서 라우트에 로그인 게이트를 두고(우리 키로 남의 검색을
  대신 쳐주지 않는다), 화면은 타이핑이 멎고 350ms 뒤에야 부른다.
- 검색 결과의 주소는 **네이버가 준 지번 주소를 그대로 쓴다**. 리버스 지오코딩도 지번을 주지만
  방금 목록에서 본 주소가 글자 그대로 남아야 하고(가게가 앉은 필지의 번지는 대표 좌표를
  되짚은 번지와 늘 같지는 않다), 유료 호출을 아끼는 실익도 있다. 그래서 `seedAddress` 가
  있는 동안에는 리버스 지오코딩을 아예 부르지 않는다.
  지도를 끌면 `seedAddress` 를 버리고 그때부터 리버스 지오코딩이 주소를 맡는다 — 주소의
  근거가 핀이 문 지도 중심으로 되돌아오므로, 보이는 주소와 저장될 위치는 늘 같은 곳이다.
- 키가 없어도 앱은 그대로 돈다. 검색 화면에만 "장소 검색이 아직 설정되지 않았어요" 가 뜨고,
  지도 키만 있으면 위치는 지도를 끌어서 고를 수 있다.
- **고른 위치는 그대로 저장된다** — 장소명 · 지번 주소 · 좌표가 `place` 의
  `name`/`address`/`lat`/`lng` 로 들어간다. 위 "맛집" 절의 규칙을 그대로 따른다.
- 장소 선택 화면의 "이 위치로 등록하기" 는 **주소를 읽어 낸 뒤에만** 눌린다. 주소가 없는
  위치를 등록 화면으로 돌려보내면 거기서 "필수 항목 확인" 으로 막히는데, 정작 무엇이
  빠졌는지는 지도 화면에서만 알 수 있다.
- 등록 화면은 주소 문구를 따로 들고 있지 않다. 고른 위치(`savedLocation`) 하나에서 뽑는다 —
  문구를 따로 두면 "주소는 채워졌는데 좌표가 없어 저장은 막히는" 상태가 생긴다.
  수정 화면은 저장된 `name`/`address`/`lat`/`lng` 로 이 값을 되살리므로, 다시 연 지도도
  등록했던 자리에서 시작한다.
- **핀과 마커는 쓰임이 다르다.** 위치를 *고르는* 화면(장소 선택)은 컨테이너 중앙에 고정된
  DOM 핀을 쓰고, 이미 정해진 좌표를 *보여주는* 지도(상세 · 등록 미리보기)는 `marker` prop 으로
  실제 마커를 찍고 `showCenterPin={false}` 로 중앙 핀을 끈다. 둘 다 켜면 핀이 두 개 보인다.
- 상세 화면도 이제 `NaverMap` 이다. 정적 이미지를 얹던 `MapPreview` 는 지웠고
  (`MapPreview.tsx` → `MapPlaceholder.tsx`), `public/images/map-detail.jpg` 와
  `map-picker.jpg` 는 아무도 참조하지 않는다. `MapPlaceholder` 는 계속 쓴다 —
  아직 위치를 고르지 않았거나 지도를 못 띄운 자리다.
- 지도 높이는 고정값이 아니라 `clamp` 다. 등록 `clamp(120px, 20vw, 170px)` ·
  상세 `clamp(170px, 26vw, 220px)` · 장소 선택 `clamp(280px, 48vh, 480px)`.
  장소 선택만 `vh` 인 이유는 하단 "이 위치로 등록하기" 가 접히면 안 되기 때문이다.
- 등록 화면의 오류 표시는 **폼을 한 번이라도 건드린 뒤**(`touched`)에만 뜬다. 저장 버튼은
  필수 항목이 빌 때 비활성 + "필수 항목 확인" 이다. 배너 문구는 지금 비어 있는 항목만 이어
  붙이고 조사(을/를)는 앞 글자 받침으로 고른다.

## 스토리지 (사진)

- 버킷 `profile-image` · `place-image` · `product-image` (모두 public). 헬퍼는 `src/lib/supabase/storage.ts`.
- 경로 규약: `<user_id>/<uuidv4>.<ext>`. 파일명은 `randomUUID()`(v4), 확장자는 파일명이 아니라
  **MIME 에서** 뽑는다. 앞의 uid 폴더가 있어야 storage RLS 로 소유권을 강제할 수 있다.
- 테이블(`profile.image_path` · `place_image.image_path`)에는 **경로만** 저장한다. 공개 URL 은 BFF 가
  `SUPABASE_STORAGE_URL` 과 조립해 `imageUrl` 로 내려준다. 브라우저는 스토리지 주소를 모른다.
- 제한은 두 겹이다: BFF 검증(5MB · JPG/PNG/WebP/GIF)과 버킷의
  `file_size_limit` / `allowed_mime_types`. 하나만 바꾸면 안 된다.
- `product-image` 는 결이 다르다. 앱에서 올리지 않고 운영자가 대시보드로 넣는 자산이라
  **읽기 전용**이다 — `<user_id>/` 폴더 규약도, 업로드 헬퍼도, 쓰기 정책도 없다.
  경로가 곧 파일명이고(`001-banner-lg.png`), 앞단 조립 규칙만 다른 둘과 같다.
- 사진 교체 시 순서: 업로드 → DB 반영 → 그다음에 이전 파일 삭제.
  DB 가 실패하면 방금 올린 파일을 되돌린다. 반대로 하면 DB 실패 때 멀쩡한 사진만 날아간다.

## 상품 (`product`)

- 강연·모임 상품. **조회만 한다** — 등록·수정 화면이 없고 BFF 에도 쓰기 라우트가 없다.
  운영자가 Supabase 대시보드로 행을 넣고 사진을 올린다.
- 테이블에 RLS 는 켜져 있는데 **정책이 하나도 없었다**. RLS 는 "정책에 허용된 것만 통과" 라
  정책 0개 = 전부 차단이다. 그래서 `product is readable by authenticated users`
  (마이그레이션 `product_read_policies`)를 만들었다.
- **`status = 'Public'` 인 행만 보인다.** 판정은 RLS 정책이 하고, 쿼리
  (`selectPublicProducts` / `selectPublicProductDetail`)도 같은 조건을 건다 —
  `place` 의 `deleted_at` 과 같은 이유로, 쿼리만 읽고도 무엇이 빠지는지 알 수 있어야 한다.
  둘은 **같은 값**이어야 한다.
- 목록에 커서가 없다. `product.id` 는 uuid v4 라 순서에 아무 의미가 없어 키셋을 짤 수 없고,
  목록 자체가 배너 몇 장이라 넘길 페이지가 없다. `?limit=` (기본 20, 최대 50)만 받는다.
  정렬은 다가오는 행사 순(`event_at` 오름차순)이다. 지난 행사를 날짜로 걸러내지는 않는다 —
  무엇을 내릴지는 운영자가 `status` 로 정한다.
- 상세 id 는 uuid 라 **형태부터 검사한다**(`parseProductId`). 그냥 넘기면 PostgREST 가
  `22P02` 로 돌려주는데, 이 코드는 `fromSupabaseError` 의 표에 없어서 400 이어야 할 요청이
  500 으로 떨어진다.
- `price` 는 `numeric` 이다. 드라이버에 따라 문자열로 실려 오므로 `toProductBase` 가
  `Number()` 로 못박는다. 문자열이면 화면의 `formatWon` 이 자릿점 없이 그대로 찍는다.
- **사진은 컬럼 넷이 두 벌이다**: `image_path_main_{lg,md}`(배너) ·
  `image_path_detail_{lg,md}`(상세 본문). 각 벌은 같은 사진의 **다른 크롭**이다
  (lg 2048×768 · md 1829×860). 자세한 건 아래 "반응형" 의 lg/md 규칙.
- 주소는 다른 버킷과 같은 규약이다 — 앞단은 `SUPABASE_STORAGE_URL`, 뒷단은 위 네 컬럼.
  테이블에는 경로만 있고 조립은 BFF(`productImageUrl`)가 한다.
- `product` 에 없는 화면 문구는 `src/components/food/payments.ts` 의 상수로 남아 있다:
  `PRODUCT_CATEGORY`(분류) · `DESCRIPTION_TITLE`(본문 제목) · `REFUND_POLICY`(환불 규정) ·
  `MAX_PER_ORDER`(1회 신청 상한). 컬럼이 생기면 여기를 지운다.
- **"남은 자리" 는 화면에서 뺐다.** 팔린 수를 셀 데가 없다 — `payment` 에 인원 컬럼이 없어서
  결제 건수로도 정원을 깎을 수 없다. 없는 숫자를 지어내는 대신 `capacity`(정원)만 보여준다.
  `payment` 에 인원이 생기면 그때 "정원 N명 중 M자리" 로 되돌린다.
- 화면 쪽 데이터 훅은 `src/components/food/useProducts.ts` 다
  (`useProductList` / `useProductDetail`). `usePlaceList` 와 달리 로그인 여부를 받지 않는다 —
  부르는 화면(메인 배너 · 상품 상세)이 로그인한 뒤에만 그려지기 때문이다.
- 행사 시각은 **한국 시간으로 고정**해 보여준다(`formatEventAt` / `formatEventDate`).
  구로에서 열리는 모임이라 보는 사람의 시간대를 따라가면 해외에서 열어 본 참가자에게
  엉뚱한 시각이 뜬다. 정각이면 분을 떼고 "오후 12시" 로 쓴다.

## 강연·모임 결제 (배너)

> **결제 규칙의 원본은 `rules/payment.md` 다.** 결제·웹훅·취소·환불 중 무엇을 건드리든
> 그 문서를 먼저 읽는다. 아래는 화면 쪽 요약일 뿐이고, 어긋나면 그쪽이 맞다.
> 포트원 문서·API 스펙은 포트원 MCP 서버(`portone-mcp-server`)로 조회한다.

- **결제는 포트원 V2 로 실제 배선돼 있다.** 카드 인증결제 한 갈래다.
  상품은 DB 에서 오고(위 "상품" 참고), 결제 건은 `payment` / `payment_snapshot` 에 남는다.
  아직 화면 상태로만 흐르는 건 **주문 내역 조회와 결제 취소** 둘뿐이다
  (`FoodApp` 의 `orders` / `cancellations`). 붙일 때의 규칙은 `rules/payment.md` 9절에 있다.
- **결제 완료 웹훅이 붙어 있다**(`POST /api/payments/webhook`). 결제창이 닫히다 만 건
  (브라우저 종료·네트워크 끊김)을 확정하는 안전망이라, 브라우저 경로와 **서로의 안전망**
  으로 먼저 도착한 쪽이 기록한다. 취소 웹훅은 아직 로그만 남긴다.
- 흐름은 한 줄이다: 메인 배너(`PromoBanner`) → 상품 상세(`BannerDetailScreen`) →
  결제 바텀시트 → **포트원 결제창** → `POST /api/payments/complete` →
  결제 완료(`PaymentCompleteScreen`) → 마이 · 결제 내역.
- **결과가 돌아오는 길이 둘이다.** PC 는 `requestPayment()` 반환값으로, 모바일은
  `redirectUrl`(`/payment/complete`)로 온다. `forceRedirect` 를 켜지 않았기 때문이고,
  그래야 PC 에서 쓰던 화면을 잃지 않는다. 리다이렉트로 온 결과는 `/payment/complete` 가
  `?payment_id=` 로 바꿔 앱에 넘기고, 그다음은 PC 와 **같은 한 갈래**로 흐른다.
- **결제 성공 여부는 브라우저가 정하지 않는다.** 결제창이 뭐라 하든 서버가 포트원 API 에
  다시 물어 확정한다(`/api/payments/complete`). 금액의 기준은 언제나 `product.price × 인원`
  이다. 완료 처리는 멱등하다 — 새로고침해도 같은 영수증이 나온다.
- 결제 시트는 상세 화면 안에 있다(라우팅이 아니라 `BottomSheet`). 열려 있을 때만 마운트해서
  닫으면 고르던 인원이 처음 값으로 돌아간다.
- 인원 상한은 `min(MAX_PER_ORDER, capacity)` 다. 상한에서는 `Stepper` 의 + 가 비활성이 되고,
  왜 못 늘리는지는 바로 아래 "최대 N명까지…" 문구가 말해 준다. 둘은 같이 움직인다.
  `MAX_PER_ORDER` 는 화면(`payments.ts`)과 BFF(`lib/bff/payment.ts`)에 같은 값으로 있다.
- 주문 번호는 포트원 `paymentId` 이자 `payment.transction_key` 다 — **uuid v4**.
  결제 버튼을 누른 순간 만든다. 렌더 중에 만들면 서버와 클라이언트가 다른 값을 그려
  hydration 이 깨진다.
- 결제창 키(`PORTONE_STORE_ID` / `PORTONE_CHANNEL_KEY`)는 `NEXT_PUBLIC_` 없이
  `/api/payments/config` 가 내려준다(지도 키와 같은 판단). `PORTONE_API_SECRET` 은
  **브라우저로 나가지 않는다.** 키가 없으면 결제 버튼만 "결제 준비 중" 으로 잠기고
  나머지 앱은 그대로 돈다.
- 웹훅이 쓰는 키는 따로다: `PORTONE_WEBHOOK_SECRET`(서명 검증) · `SUPABASE_SECRET_KEY`
  (RLS 우회 기록). 둘 다 브라우저로 나가지 않고, 없으면 웹훅만 503 으로 받지 않는다 —
  결제 자체는 그대로 된다.
- `payment` 는 **insert-only 원장**이다. 결제·취소를 `type` 으로 가르고 `transction_key`
  (= 포트원 `paymentId`)로 묶는다. 금액은 **결제 +, 취소 −** 라 그룹의 `sum(amount)` 이 곧
  남은 금액이다. 중복 결제는 유니크 `(transction_key, type)` 가 막는다.
- 결제가 끝나면 결제 내역 맨 위에 그 건이 얹힌다. 그래야 완료 화면의 "결제 내역 보기" 가
  빈 목록으로 떨어지지 않는다.
- 결제 취소는 결제 내역에서 빼고 취소 내역으로 옮긴다(전액 환불로만 다룬다). 옮길 건은
  `setState` updater **밖에서** 찾는다 — updater 안에서 다른 state 를 건드리면 StrictMode 가
  두 번 부를 때 취소 내역이 두 줄이 된다.
- 취소 기한이 지난 건(`cancellable: false`)은 버튼 대신 이유를 남긴다. 눌리는데 아무 일도
  안 일어나는 버튼보다 낫다.
- 마이 화면의 탭 상태(`myTab`)는 `FoodApp` 이 들고 있다. 결제 완료 화면이 "결제 내역" 탭을
  바로 열어야 해서(`openMyTab`), 마이 화면 안에만 두면 밖에서 지정할 수가 없다.
- 로그아웃하면 결제·취소 내역도 초기값으로 되돌린다. 화면 상태라 안 지우면 다음 사람이
  남의 내역을 본다.
- 배너·상세 사진은 이제 `product-image` 버킷에서 온다. `public/images/banner-tour*.png`
  (디자인의 생성 이미지)는 더 이상 아무도 참조하지 않는다.

# 반응형 (핸드오프)

- 셸 프리미티브 재사용: `src/components/food/shell.tsx`
- 리스트형(메인·마이): 컨테이너 max-width `1280`, 카드 그리드 `repeat(auto-fill, minmax(320px, 1fr))`, gap `12`.
  마이의 세 탭(내가 쓴 글·결제 내역·취소 내역)은 모두 같은 카드 그리드를 쓴다.
- 읽기·폼형(상세·등록·장소 검색·장소 선택·배너 상세·결제 완료): max-width `760`.
  로그인: max-width `480`. 결제 바텀시트도 `maxWidth={760}` 으로 같이 잡는다.
- 컨테이너 중앙 정렬, 좌우 패딩 `clamp(16px, 4vw, 32px)`, 초과분은 좌우 여백.
- sticky 톱바·fixed 하단바: 풀블리드 배경 + 내부 콘텐츠는 컨테이너 폭에 정렬.
- FAB: 컨테이너 우측 끝에 정렬.
- 상품 사진의 lg/md 는 `ProductImage` 한 곳에서 고른다. 경계는 `DESKTOP_MIN_WIDTH = 1280`
  으로 `LIST_MAX` 와 같은 값이다 — 뷰포트가 우리가 그리는 가장 넓은 본문만큼 넓어졌을 때가
  "데스크톱" 이다. 흔한 1024 가 아닌 이유는 태블릿이 md 를 받아야 하기 때문이다
  (아이패드 프로 세로가 정확히 1024라, 1024로 자르면 태블릿이 데스크톱 크롭을 받는다).
- `srcset` 이 아니라 `<picture>` + 미디어 쿼리인 이유는 두 파일이 **비율이 다른 크롭**이라서다.
  `srcset` 은 "같은 그림의 다른 해상도" 를 전제로 브라우저가 알아서 고르는 장치라, 화면비에
  따라 그림 자체를 바꾸려면 `<picture>` 로 지정해야 한다. 고른 쪽 한 장만 내려받는다.
