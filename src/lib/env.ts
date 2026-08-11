import "server-only";

/**
 * 서버 전용 환경변수를 읽는다. 없으면 즉시 터뜨린다.
 *
 * 조용히 undefined 로 흘려보내면 "왜 401이 나지" 같은 엉뚱한 증상으로 나타난다.
 * 부팅하자마자 이름을 찍어주는 편이 훨씬 빠르게 고칠 수 있다.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env] 환경변수 ${name} 가 없습니다. .env.local 을 .env.example 기준으로 채워주세요.`,
    );
  }
  return value;
}
