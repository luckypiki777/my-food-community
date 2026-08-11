import { ok } from "@/lib/bff/response";

/** 브라우저가 지도 SDK 를 받으려면 이 키가 필요하다. */
export type MapConfigResponse = {
  /** NCP Maps 의 Client ID. 설정 전이면 null — 화면은 지도 대신 안내를 보여준다. */
  clientId: string | null;
};

/**
 * 지도 SDK 키 조회.
 *
 * 지도 JS SDK 만큼은 브라우저가 직접 받아야 한다(`<script src>`). 그래도 키를
 * `NEXT_PUBLIC_` 으로 번들에 박지 않는 이유는 CLAUDE.md 규약대로 환경변수를 서버 한쪽에만
 * 두기 위해서다 — 값을 바꿔도 다시 빌드할 필요가 없다는 실익도 있다.
 *
 * 이 키는 어차피 스크립트 URL 에 실려 나간다. 숨겨서 지키는 값이 아니라 NCP 콘솔의
 * "웹 서비스 URL" 로 도메인을 묶어서 지키는 값이다. 그래서 로그인 게이트를 두지 않는다.
 *
 * `requireEnv()` 를 쓰지 않는 것도 일부러다. 키가 없다고 앱 전체가 죽을 이유는 없고,
 * 지도 자리에만 "설정되지 않았어요" 가 뜨면 나머지 화면은 그대로 쓸 수 있다.
 */
export function GET() {
  return ok<MapConfigResponse>({ clientId: process.env.NAVER_MAP_CLIENT_ID ?? null });
}
