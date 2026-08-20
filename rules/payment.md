# 결제 규칙 (SSOT)

**결제 관련 작업은 이 문서를 먼저 읽고 시작한다.** 코드와 어긋나면 **이 문서가 맞다** — 코드를 고치거나, 결정을 바꿨다면 이 문서를 같이 고친다.

결제사는 **포트원(PortOne) V2**. 문서·API 스펙은 포트원 MCP 서버(`portone-mcp-server`)로 조회한다. 웹 검색으로 찾은 옛 예제(V1 · `IMP.request_pay` 류)를 쓰지 않는다.

## 1. 원칙

1. **브라우저가 하는 말은 아무것도 믿지 않는다.** 성공 여부·금액·통화·구매자는 서버가 포트원 API 에 **다시 물어서** 확정한다.
2. **금액의 근거는 언제나 우리 DB 다.** `product.price × 인원` 이 기준이고, 포트원이 알려준 실제 결제 금액이 다르면 거절한다.
3. **완료 처리는 멱등하다.** 들어오는 길이 셋(PC 반환값 · 모바일 리다이렉트 · 웹훅)인데 전부 `completePayment()` 한 곳으로 모인다.
4. **CLAUDE.md 의 BFF 규약을 따른다.** 브라우저는 포트원 REST API 를 부르지 않는다. 시크릿이 필요한 호출은 `/api/payments/*` 가 서버에서 한다.

## 2. 지금 있는 것과 없는 것

| 기능 | 상태 | 자리 |
|---|---|---|
| 카드 결제(인증결제) | **있다** | 배너 상세 → 결제 시트 |
| 서버 결제 검증·기록 | **있다** | `POST /api/payments/complete` |
| 결제 완료 웹훅 | **있다** | `POST /api/payments/webhook` |
| 결제 취소·환불(전액) | **있다** | 마이 · 결제 내역 → `POST /api/payments/[paymentId]/cancel` |
| 결제 취소 웹훅 | **있다** | `POST /api/payments/webhook` |
| 결제·취소 내역 조회 | **있다** | `GET /api/payments` |
| 부분 취소 | 없다 | 9-3 |
| 가상계좌·간편결제 | 없다 | 9-3 |
| 내역 페이지네이션(커서) | 없다(상한만 있다) | 9-4 |

## 3. 흐름

```
배너 상세 → 결제 시트에서 인원 선택
  → PortOne.requestPayment()        ← 브라우저. 결제창이 뜬다
  → [PC] 반환값   [모바일] /payment/complete 로 리다이렉트
  → POST /api/payments/complete  ┐
  → POST /api/payments/webhook   ┘ 둘 다 completePayment() 로 모인다
  → payment_snapshot · payment 기록   ← 여기서만 결제가 "확정" 된다 → 결제 완료 화면
```

- **PC/모바일 갈래가 둘인 이유**: `forceRedirect` 를 켜지 않아 포트원이 환경에 맞는 쪽을 고른다. PC 는 프라미스가 결과를 들고 리졸브되어 쓰던 화면이 남고, 모바일은 페이지가 통째로 떠났다 돌아온다. **`redirectUrl` 을 주지 않으면 모바일 결제 UI 가 제대로 뜨지 않는다.** 반환값이 `undefined` 면 리다이렉트로 갔다는 뜻이다.
- **`redirectUrl` 은 절대 주소**여야 한다. 환경변수로 박지 않고 `window.location.origin` 으로 만든다 — 로컬·프리뷰·운영 도메인이 저마다 달라서, 고정하면 프리뷰가 엉뚱한 곳으로 돌아온다.
- **리다이렉트가 돌아오는 자리**(`app/payment/complete/page.tsx`)는 아무것도 그리지 않는다. 포트원 쿼리(`paymentId`/`code`/`message`)를 앱이 아는 이름(`payment_id`/`payment_error`/`payment_message`)으로 바꿔 `/` 로 307 한다. 모바일은 돌아온 시점에 React 상태가 다 날아간 뒤라, 결과 판정과 화면은 PC 와 똑같이 `FoodApp` 한 곳에서 한다.
- **웹훅과 브라우저는 서로의 안전망이다.** 도착 순서는 보장되지 않고, 먼저 온 쪽이 기록한다. 멱등하므로 순서는 상관없다.

취소도 같은 모양이다.

```
마이 · 결제 내역 → [결제 취소]
  → POST /api/payments/[paymentId]/cancel   ← 브라우저는 주문 번호만 보낸다
  → 포트원 결제 취소 API                     ← 서버. 시크릿이 필요하다
  → recordCancellation()  ┐
  → 취소 웹훅              ┘ 둘 다 같은 함수로 모인다
  → payment_snapshot · payment(type: CANCEL, 음수) 기록 → 취소 내역
```

- **취소도 브라우저 말을 믿지 않는다.** 취소 금액은 요청 본문이 아니라 포트원 결제 조회의 `amount.cancelled` 에서 읽는다.
- **취소는 새 행이다.** 결제 행을 고치지 않는다 — 8절의 원장 규칙 그대로다.

## 4. 환경변수와 키

| 이름 | 어디까지 나가나 | 쓰는 곳 |
|---|---|---|
| `PORTONE_STORE_ID` · `PORTONE_CHANNEL_KEY` | 브라우저까지 | 결제창 |
| `PORTONE_API_SECRET` | **서버 밖으로 안 나간다** | 결제 조회 · 결제 취소 |
| `PORTONE_WEBHOOK_SECRET` | **서버 밖으로 안 나간다** | 웹훅 서명 검증 |
| `SUPABASE_SECRET_KEY` | **서버 밖으로 안 나간다** | 웹훅의 DB 기록(RLS 우회) |

- **`NEXT_PUBLIC_` 을 붙이지 않는다.** 앞의 둘도 마찬가지다. `/api/payments/config` 가 읽어서 내려주면 환경변수가 서버 한쪽에만 남고, 키를 바꿔도 다시 빌드할 필요가 없다.
- **위 셋 중 하나라도 비면 결제 버튼이 "결제 준비 중" 으로 잠긴다**(`canStartPayment()`). `API_SECRET` 까지 보는 이유가 중요하다 — 그 값은 결제창을 여는 데 쓰이지 않아서, 없어도 **결제창은 뜨고 카드 승인까지 난다.** 막히는 건 그다음 완료 처리(503)뿐이라 돈은 나갔는데 DB 엔 아무것도 없는 상태가 된다. 가능한 상태 중 가장 나쁜 자리이므로 **시작 전에** 끊는다(2026-08-19 에 실제로 났던 일).
- **아래 둘이 비면 결제는 그대로 되고 웹훅만 503 으로 받지 않는다.** 검증 없이 웹훅을 받는 선택지는 없다 — 웹훅 주소는 공개 URL 이라 아무나 "결제 완료" 를 만들어 넣을 수 있다. 채워 넣으면 그 사이 밀린 건이 포트원 재전송으로 따라 들어온다.
- 이렇게 막혀 고아가 된 결제 건은 **되살릴 수 있다.** 키를 채운 뒤 그 `paymentId` 로 `/api/payments/complete` 를 한 번 부르면 된다. 앱에서는 `/?payment_id=<paymentId>` 로 들어가면 같은 경로를 탄다.
- 값의 출처와 자세한 설명은 `.env.example` 에 있다.

## 5. `paymentId` · `customData` 규약

- **`paymentId` 는 uuid v4 다.** 포트원의 결제 건 ID 이자 `payment.transction_key`(uuid 컬럼)에 그대로 들어가는 값이라 형태가 곧 스키마다. 화면의 "주문 번호" 도 같은 값이다. 사람이 읽기 좋은 번호가 필요해지면 `payment` 에 `text` 컬럼을 따로 만든다.
- **브라우저가, 결제 버튼을 누른 순간 만든다**(`newPaymentId()`). 렌더 중에 만들면 서버와 클라이언트가 다른 값을 그려 hydration 이 깨진다. `crypto.randomUUID()` 는 보안 컨텍스트에서만 있으므로 `getRandomValues` 폴백을 둔다(휴대폰 실기기 테스트용).
- 이미 끝난 `paymentId` 로 다시 요청하면 포트원이 거절한다. 재시도는 **새 id** 로 한다.
- `customData` 는 `{ productID, userID, headcount }` 다. 응답에서 **문자열로** 돌아오므로 `JSON.parse` 해야 한다. 키 이름의 대소문자를 바꾸지 않는다 — 이미 나간 결제 건들의 스냅샷에 이 이름으로 얼어 있다.
- **이건 브라우저가 준 값이다.** 신원 증명이 아니라 "무엇을 사려 했는지" 의 실마리로만 쓴다. 실제 판정은 여기 적힌 상품을 DB 에서 다시 읽어서 한다. `headcount` 는 포트원 응답에 없는 값이라(결제창은 총액만 안다) 여기 실어야 한다.

## 6. 서버 검증 규칙

`completePayment()` 가 **이 순서로** 본다. 하나라도 걸리면 기록하지 않는다. **세 경로가 모두 이 표 하나를 지난다.**

| # | 보는 것 | 어긋나면 |
|---|---|---|
| 0 | (브라우저 경로만) 로그인 여부 | 401 |
| 1 | `paymentId` 가 uuid 인가 | 400 `invalid_payment_id` |
| 2 | **이미 기록한 건인가** | **200** — 저장된 스냅샷으로 같은 영수증 (멱등) |
| 3 | 포트원에 결제 건이 있는가 | 404 `payment_not_found` |
| 4 | 우리 상점(`storeId`)의 건인가 | 404 `payment_not_found` |
| 5 | `status === "PAID"` 인가 | 실패/취소면 400, 진행 중이면 409 `payment_pending` |
| 6 | `currency === "KRW"` 인가 | 400 `invalid_currency` |
| 7 | `customData` 가 형식에 맞는가 | 400 `invalid_custom_data` |
| 8 | 구매자가 맞는가(아래) | 403 `forbidden` |
| 9 | 상품이 DB 에 있고 `status = 'Public'` 인가 | 404 `not_found` |
| 10 | `headcount ≤ min(MAX_PER_ORDER, capacity)` 인가 | 400 `invalid_headcount` |
| 11 | `amount.total === price × headcount` 인가 | 400 `amount_mismatch` |
| 12 | `orderName === product.name` 인가 | 400 `order_mismatch` |
| 13 | **결제 행 삽입이 유니크에 걸리는가** | 200(다시 조회) · 못 찾으면 409 `already_recorded` |

- **8번만 경로에 따라 갈린다**(`PaymentActor`). 브라우저 경로는 `customData.userID` 가 **지금 로그인한 사람과 같아야** 한다 — 이 검사가 없으면 남의 결제 건 ID 로 자기 내역을 만들 수 있다. 웹훅 경로는 로그인한 사람이 없으므로 그 값을 그대로 구매자로 쓰되 **실재하는 사용자인지** 확인한다. 요청의 진위는 그 앞의 서명 검증이 보장한다.
- **중복 결제는 2번과 13번, 두 겹으로 막는다.** 2번은 미리 걸러 왕복을 아끼는 것이고 실제 방어선은 13번의 유니크 인덱스 `(transction_key, type)` 다 — 브라우저와 웹훅이 동시에 들어오면 2번은 둘 다 통과할 수 있다. 유니크 위반(`23505`)은 오류가 아니라 **멱등하게** 다시 조회해 돌려준다.
- **5번을 400 과 409 로 가르는 이유**: 실패한 결제는 다시 물어도 답이 안 바뀌지만, 진행 중인 결제는 나중에 바뀐다. 다시 부를 가치가 있는지를 상태 코드로 알려준다.
- **12번이 있으므로 `orderName` 에 인원 따위를 덧붙이면 안 된다.** 주문명은 상품명 글자 그대로다.
- **아직 켜지 않은 검사: `channel.type !== "LIVE"`.** 지금 테스트 채널을 쓰므로 켜지 않았다. 대신 `channel` 을 스냅샷에 통째로 남긴다. 운영 전환은 10절.

## 7. 웹훅

`POST /api/payments/webhook`. **결제 완료와 결제 취소를 같은 문으로 받는다.** 결제창이 닫히다 만 건(브라우저 종료·네트워크 끊김)과, 콘솔에서 직접 환불한 건을 확정하는 안전망이다.

- **로그인 게이트를 두지 않는다** — 부르는 쪽이 포트원 서버다. 대신 두 겹으로 막는다: 요청의 진위는 **서명 검증**이, 결제·취소의 진위는 **포트원 결제 조회**가 판정한다. 금액조차 본문에서 읽지 않는다.
- **서명은 `@portone/server-sdk` 의 `Webhook.verify(secret, body, headers)`** 로 검증한다(Standard Webhooks · 웹훅 버전 `2024-04-25`). 실패는 400 으로 끊는다.
- **본문은 원문 문자열이어야 한다.** `request.text()` 로 받는다. JSON 으로 파싱한 뒤 다시 직렬화하면 서명이 깨진다.
- **하는 일은 `completePayment()`(결제) 또는 `recordCancellation()`(취소)을 부르는 것뿐이다.** 검증 로직을 따로 만들지 않는다.
- 처리하는 이벤트는 넷이다.

  | `type` | 하는 일 |
  |---|---|
  | `Transaction.Paid` | `completePayment()` — 6절의 표를 그대로 지난다 |
  | `Transaction.Cancelled` | `recordCancellation()` — 전액 취소 |
  | `Transaction.PartialCancelled` | `recordCancellation()` — 첫 건만 기록된다(9-3) |
  | `Transaction.CancelPending` | `recordCancellation()` — 아직 취소 금액이 0 이라 기록 없이 200 |

- 포트원은 예고 없이 새 `type` 을 추가하므로 **모르는 이벤트에 오류를 내지 말고 무시**한다.
- **응답 코드가 곧 재전송 지시다.** 포트원은 2xx 가 아니면 최대 5회(0·1·4·16·64·256분) 재전송한다. Connection/Read Timeout 은 각 30초.
  - **2xx** — 다 됐거나, 다시 불러도 답이 안 바뀌는 경우(위변조 의심 · 우리 상점 아님 · 모르는 이벤트 · uuid 아닌 결제 건).
  - **400** — 서명 검증 실패. 포트원이 보낸 게 아니다.
  - **503** — 지금은 못 하지만 나중엔 될 수 있는 경우(포트원 조회 실패 · DB 오류 · 설정 누락 · `payment_pending` · 아직 기록되지 않은 결제의 취소). 재전송이 곧 복구다.
- **여기서만 RLS 를 우회한다**(`createSupabaseAdminClient()`). 세션이 없어 `auth.uid() = user_id` 정책을 만족시킬 방법이 없기 때문이다. **다른 라우트로 이 키를 넓히지 않는다** — 넓히는 순간 RLS 가 방어선 역할을 못 한다.

## 8. 데이터 모델

### `payment` — insert-only 원장

| 컬럼 | 값 |
|---|---|
| `transction_key` | 포트원 `paymentId`. **결제·취소 행을 묶는 그룹키** |
| `type` | `'PAYMENT'` \| `'CANCEL'` |
| `amount` | **결제는 양수(+), 취소는 음수(−)** |
| `product_id` · `user_id` | 상품 · 구매자 |
| `payment_snapshot_id` | 아래 스냅샷 |

**상태 컬럼이 없다. 일부러 그렇다.** 결제도 취소도 각각 한 행으로 쌓고, 지금 상태는 같은 `transction_key` 를 가진 행들을 모아서 읽는다 — `sum(amount)` 가 곧 남은 결제 금액이다. 그래서 기록을 고치는 일이 없고, RLS 에도 update/delete 정책을 두지 않았다. (컬럼명 `transction_key` 의 오타는 원본 스키마 그대로다.)

**한 결제 건에 취소 행은 최대 하나다** — 유니크 `(transction_key, type)` 가 그렇게 만든다. 전액 취소만 다루는 지금은 이게 맞고, 부분 취소를 열려면 유니크부터 다시 설계해야 한다(9-3).

DB 도 같은 규칙이다(마이그레이션 `payment_ledger_group_key_and_amount_sign`): 유니크 `(transction_key, type)` · `payment_type_check` · `payment_amount_sign`. **코드(`PAYMENT_TYPE` · `signedAmount()`)와 같은 값이다. 한쪽만 바꾸면 안 된다.**

### `payment_snapshot` — 결제 시점을 얼린다

`snapshot_payment` 는 포트원 결제 조회 응답 **전체**, `snapshot_product` 는 결제 시점의 상품 행 + `headcount`. **영수증을 `product` 에서 다시 읽지 않는 이유다** — 운영자가 가격을 고치거나 상품을 내리면 지난 영수증까지 같이 바뀐다. 응답 전체를 넣어 두므로 나중에 필요해진 필드(영수증 URL · PG 거래번호 · 할부)는 마이그레이션 없이 꺼내 쓴다.

### RLS (마이그레이션 `payment_rls_policies`)

- `payment` — 본인 것만 읽고 본인 것만 넣는다. update/delete 정책은 없다.
- `payment_snapshot` — 읽기는 "이 스냅샷을 가리키는 `payment` 행이 내 것일 때". 삽입은 `with check (true)` 다. `payment.payment_snapshot_id` 가 NOT NULL 이라 스냅샷을 **먼저** 넣어야 하는데 그 시점엔 아직 주인이 없기 때문이다.
- 인덱스(`payment_foreign_key_indexes`) — 스냅샷 읽기 정책이 `payment.payment_snapshot_id` 를 되짚으므로 그 인덱스가 **정책의 성능 전제**다. `(user_id, created_at desc)` 는 9-4 의 내역 목록이 타는 축이다.
- 쓰기 순서와 되돌리기: **스냅샷 → 결제 행.** PostgREST 는 두 호출을 한 트랜잭션으로 묶어 주지 않으므로, 결제 행 삽입이 실패하면 방금 넣은 스냅샷을 지운다. 취소도 같다 — **스냅샷 → 취소 행.**
- **스냅샷 id 는 서버가 만들어서 넣는다**(`insertSnapshot()` 의 `randomUUID()`). `.insert().select("id")` 로 돌려받으면 안 된다: RETURNING 은 스냅샷의 SELECT 정책("이 스냅샷을 가리키는 `payment` 행이 내 것일 때")을 지나야 하는데, 삽입 시점엔 그 결제 행이 아직 없다(있으면 안 된다 — `payment_snapshot_id` 가 NOT NULL 이라 스냅샷이 먼저다). 그래서 세션 클라이언트는 방금 넣은 자기 스냅샷을 스스로 읽지 못하고 `42501` 로 떨어진다. **웹훅의 admin 클라이언트만 RLS 를 우회해 통과했으므로 브라우저 경로에서만 나던 오류다.** id 를 먼저 정하면 돌려받을 것이 없다.

## 9. 결제 취소 · 내역

전액 취소 한 갈래다. 취소가 원장에 쌓이는 자리는 `recordCancellation()`(`lib/bff/paymentCancel.ts`) **하나뿐**이다 — 우리가 부른 취소도 웹훅으로 한 번 더 돌아오므로, 두 경로가 서로 다른 행을 만들면 같은 취소가 원장에 두 줄로 남는다.

### 9-1. 취소 웹훅

`Transaction.Cancelled`(전액) · `Transaction.PartialCancelled`(부분) · `Transaction.CancelPending`(비동기 취소 요청).

- 라우트·서명 검증·응답 코드 규약은 **7절 그대로**다. 새 라우트를 만들지 않았다.
- **취소는 새 행이다.** 기존 `payment` 행을 고치지 않는다 — 같은 `transction_key` 에 `type: 'CANCEL'` · **음수 `amount`** 로 한 행을 더 쌓는다. 스냅샷도 취소 시점 응답으로 한 벌 더 만든다.
- 금액은 웹훅 본문이 아니라 **포트원 결제 조회의 `amount.cancelled`** 에서 읽는다. 그 값은 누적 취소액이므로 **직전까지 쌓인 취소 합과의 차액**만 넣는다. 그래야 `sum(amount)` 이 남은 금액과 맞는다.
- **멱등하다.** 재전송·중복 취소 웹훅은 흔하다. 이미 취소 행이 있으면 그대로 돌려주고, 차액이 0이면(=`CancelPending`) 아무것도 넣지 않고 200 으로 끝낸다.
- 취소 행의 `user_id`·`product_id` 는 **원 결제 행에서 가져온다.** `customData` 를 다시 믿지 않는다.
- **원 결제 행이 없으면 503 으로 재전송을 부탁한다.** 브라우저 완료 처리가 아직 도착하지 않았을 수 있다. 취소 행만 먼저 쌓으면 `sum(amount)` 이 음수가 된다.

### 9-2. 결제 취소·환불 (우리가 먼저 부르는 쪽)

라우트는 `POST /api/payments/[paymentId]/cancel`. 포트원 취소 API 를 **서버에서** 부른다 — `PORTONE_API_SECRET` 하나면 남의 결제까지 취소할 수 있으므로 브라우저로 내려보내지 않는다.

- **권한 게이트는 RLS 다.** 원 결제 행을 세션 클라이언트로 읽으므로, 남의 결제 건 ID 를 넣으면 행이 보이지 않고 404 로 끝난다.
- 원장 기록은 9-1 과 **같은 함수**(`recordCancellation()`)를 탄다.
- **멱등하다.** 이미 취소 행이 있으면 포트원을 부르지 않고 그 행을 그대로 돌려준다. 포트원이 `PAYMENT_ALREADY_CANCELLED`(콘솔에서 먼저 환불했거나 웹훅이 앞섰다)를 주면 오류가 아니라 기록만 이어서 한다.
- **취소 가능 여부의 판단 근거는 `REFUND_POLICY` 가 아니라 `isCancellable()`(`lib/bff/paymentHistory.ts`) 이다.** 지금 규칙은 **행사 시작 전까지 전액 환불** 하나다. 화면 문구(`REFUND_POLICY`)도 같은 값이어야 한다 — 문구는 아무것도 강제하지 못하므로, 어긋나면 안내와 실제 동작이 갈라진다. (전에는 "행사 7일 전까지 전액 · 3일 전까지 50%" 라고 적혀 있었지만 부분 환불은 구현된 적이 없다.)
- 취소 기한의 근거인 `event_at` 은 **결제 시점 스냅샷**에서 읽는다. 운영자가 나중에 행사 날짜를 옮겨도 이미 산 사람의 기한은 움직이지 않는다 — 내역 카드에 보이는 일시와 기한의 근거가 같은 값이어야 하기 때문이다. 날짜를 옮겼을 때 기한도 따라가야 한다면 그건 `product` 를 다시 읽는 별도 규칙이므로 여기 먼저 적는다.
- 부분 환불을 열려면 **금액 계산 규칙을 이 문서에 먼저 적고** 구현한다.

### 9-3. 아직 안 붙인 것

- **부분 취소.** 유니크 `(transction_key, type)` 가 한 결제 건에 취소 행 하나만 허용한다. 첫 부분 취소는 기록되고 그다음은 이미 있는 행으로 돌아가므로 원장이 실제 환불액과 어긋난다 — 웹훅 라우트가 그때 경고를 남긴다. 열 때는 `cancellationId` 컬럼을 더해 유니크를 다시 설계한다.
- **가상계좌·간편결제.** 가상계좌는 결제창을 닫는 시점에 아직 입금 전(`VIRTUAL_ACCOUNT_ISSUED`)이다. 7절의 처리 이벤트에 `Transaction.VirtualAccountIssued` 를 더하고, 6절 5번의 상태 판정을 상태별로 가른다. 취소도 비동기라 `CancelPending` → `Cancelled` 두 걸음을 밟는다(그 자리는 이미 열려 있다). PG사마다 지원 수단이 다르니 채널을 늘리기 전에 포트원 MCP 로 해당 PG 가이드를 읽는다.

### 9-4. 결제·취소 내역 조회

`GET /api/payments`. 마이 화면의 두 탭이 **한 요청**으로 받아 간다.

- **탭이 둘이라고 요청을 둘로 나누지 않는다.** 결제와 취소는 같은 원장에서 오고, 한 건이 취소되면 결제 내역에서 빠져 취소 내역으로 옮겨간다 — 따로 부르면 그 사이에 취소가 끼어들 때 같은 건이 양쪽에 다 보이거나 양쪽에서 다 사라진다.
- 목록은 `payment` 를 `transction_key` 로 묶어 읽는다. **두 번 읽는다** — 결제 행을 페이지만큼 읽고, 그 키들의 취소 행을 이어서 읽는다. 한 번에 읽으면 페이지 경계가 묶음 한가운데를 갈라 "결제는 있는데 취소가 안 보이는" 줄이 생긴다.
- 카드 내용은 **스냅샷에서** 만든다 — `product` 를 조인하지 않는다. 운영자가 가격을 고치거나 상품을 내려도 지난 내역이 같이 바뀌면 안 된다.
- **커서가 없다.** `?limit=`(기본 20, 최대 50)만 받고, 넘친 사실은 `hasMore` 로 알려 화면이 안내 한 줄을 붙인다. 키셋은 `created_at + id` 여야 하는데(`payment.id` 는 uuid 라 단독으로는 정렬 기준이 못 된다) 마이크로초 타임스탬프를 필터 문자열로 왕복시켜야 해서, 한 사람의 신청 내역 길이에 비해 값이 맞지 않는다. 내역이 길어지면 그때 짠다.
- 화면 쪽 짝은 `usePayments.ts` 의 `usePaymentHistory` 다. `Order.status` 의 "이용 완료" 는 컬럼이 아니라 **행사가 지났는지**로 정한다 — 서버가 미리 정해 주면 응답을 받아 둔 채 시간이 지났을 때 카드가 계속 "결제 완료" 로 남는다.

## 10. 테스트 → 운영 전환 체크리스트

- [ ] 실연동 채널을 만들고 `PORTONE_CHANNEL_KEY` 를 바꾼다.
- [ ] 6절의 `channel.type !== "LIVE"` 검사를 **켠다.** 테스트 결제가 운영 원장에 섞이면 정산이 어긋난다.
- [ ] `PORTONE_API_SECRET` · `PORTONE_WEBHOOK_SECRET` · `SUPABASE_SECRET_KEY` 를 운영 환경의 시크릿으로 넣는다. 저장소·설정 파일에 두지 않는다.
- [ ] 콘솔의 **실연동** 모드에 웹훅 URL(`/api/payments/webhook`)과 시크릿을 따로 넣는다. 테스트 모드 설정은 실연동에 적용되지 않는다.
- [ ] 콘솔의 **실연동** 모드 웹훅에 취소 계열 이벤트가 켜져 있는지 본다. 라우트는 이미 받는다(9-1).
- [ ] 모바일 실기기에서 리다이렉트 갈래를 확인한다. PC 만 보고 넘기면 모바일에서만 깨진다.
- [ ] 결제 → 취소 → 결제 내역/취소 내역까지 한 바퀴 돌려 본다. `sum(amount)` 이 0 이 되는지 콘솔에서 확인한다.

## 11. 같이 바꿔야 하는 짝

| 값 | 자리 A | 자리 B |
|---|---|---|
| `MAX_PER_ORDER` | `lib/bff/payment.ts` | `components/food/payments.ts` |
| 통화 · 결제수단 (`KRW` / `CARD`) | `lib/bff/payment.ts` | `components/food/portone.ts` |
| `type` 값 · `amount` 부호 | `lib/bff/payment.ts` | `payment` 체크 제약 · 유니크 인덱스 |
| 상품 공개 조건 (`'Public'`) | `lib/bff/product.ts` | `product` 테이블 RLS 정책 |
| `customData` 키 이름 | `components/food/portone.ts` | `lib/bff/payment.ts` (+ 지난 스냅샷들) |
| 리다이렉트 파라미터 이름 | `app/payment/complete/page.tsx` | `components/food/FoodApp.tsx` |
| `PaymentReceipt` 모양 | `lib/bff/payment.ts` | `components/food/portone.ts` |
| `OrderEntry` · `CancellationEntry` 모양 | `lib/bff/paymentHistory.ts` | `components/food/usePayments.ts` |
| 취소 기한 (행사 시작 전) | `lib/bff/paymentHistory.ts` 의 `isCancellable()` | `components/food/payments.ts` 의 `REFUND_POLICY` 문구 |

## 12. 파일 지도

| 자리 | 하는 일 |
|---|---|
| `rules/payment.md` | **이 문서. 결제 규칙의 원본.** |
| `lib/bff/payment.ts` | 검증 · 포트원 조회 · 기록(`completePayment`). 서버 전용 |
| `lib/bff/paymentCancel.ts` | 포트원 취소 호출 · 취소 기록(`recordCancellation`). 서버 전용 |
| `lib/bff/paymentHistory.ts` | 내역 조회 · 취소 기한(`isCancellable`) · 카드 조립. 서버 전용 |
| `lib/bff/paymentWebhook.ts` | 웹훅 서명 검증 · 이벤트 분류. 서버 전용 |
| `app/api/payments/{config,complete,webhook}/route.ts` | 결제창 설정(GET) · 완료 처리(POST) · 웹훅(POST) |
| `app/api/payments/route.ts` | 결제·취소 내역(GET) |
| `app/api/payments/[paymentId]/cancel/route.ts` | 결제 취소(POST) |
| `app/payment/complete/page.tsx` | 결제창이 돌아오는 자리. 앱으로 넘기기만 한다 |
| `components/food/portone.ts` · `usePayments.ts` | 결제창 호출 · 화면용 훅(`usePayment` · `usePaymentHistory` · `cancelPayment`). 화면은 이 둘만 안다 |
| `components/food/screens/MyScreen.tsx` | 마이 · 결제 내역 / 취소 내역 탭 |
| `components/food/screens/BannerDetailScreen.tsx` | 상품 상세 + 결제 시트 |
| `components/food/FoodApp.tsx` | 리다이렉트 귀환 처리 · 완료 화면 전환 |
| `components/food/payments.ts` | 화면이 쓰는 타입과 문구(상품 DB 에 없는 값) |
