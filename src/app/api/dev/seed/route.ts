import { readFile } from "node:fs/promises";
import path from "node:path";

import { insertPlaceWithImages } from "@/lib/bff/place";
import { fail, fromSupabaseError, ok, unauthorized } from "@/lib/bff/response";
import { createSupabaseServerClient, getAuthenticatedUserId } from "@/lib/supabase/server";
import { ALLOWED_IMAGE_MIME_TYPES } from "@/lib/supabase/storage";

/**
 * 개발용 시드.
 *
 * 화면을 배선하기 전 `data.ts` 에 하드코딩돼 있던 맛집들을 실제 DB로 옮긴다.
 * 목록·상세가 전부 BFF에서 오도록 바뀌었으니 이 내용도 진짜 데이터여야 한다.
 *
 * 등록 라우트와 **같은 경로**(insertPlaceWithImages)를 쓴다. 시드만 다른 길로 넣으면
 * 시드로 만든 데이터와 사용자가 만든 데이터가 서로 다른 규칙을 갖게 된다.
 *
 * 호출한 사용자 소유로 만들어진다. 스토리지 RLS 가 `<uid>/` 폴더를 강제하므로
 * 세션 없이는 어차피 사진을 올릴 수 없다.
 *
 * 운영에서는 404. 다 쓰고 나면 이 폴더째 지워도 된다.
 */

type Seed = {
  title: string;
  content: string;
  /** 지도 정보. 실제 등록과 같은 규칙이라 넷 다 있어야 한다. */
  address: string;
  lat: number;
  lng: number;
  /** `public/` 아래 경로이거나 http(s) URL. */
  images: string[];
};

/**
 * 가게는 지어낸 것이고, 좌표·주소는 제목에 나오는 동네의 대략적인 위치다.
 * 지도가 붙어 있는지 눈으로 보려고 넣은 값이라 정확한 번지는 아니다.
 * `place.name` 은 제목을 그대로 쓴다 — 시드는 지도에서 고른 상호가 따로 없다.
 */
const SEEDS: Seed[] = [
  {
    title: "광명 시골보리밥",
    content:
      "주말 점심에 다녀왔는데 보리밥 정식이 정갈하고 반찬이 계속 손이 갔어요. 좌석이 넓어서 아이랑 가도 부담 없고, 근처 공영주차장도 가까워요. 붐비지 않아서 여유롭게 먹고 왔습니다.",
    address: "경기도 광명시 하안동 60",
    lat: 37.4772,
    lng: 126.8846,
    images: ["/images/detail-hero.png", "/samples/food-1.png"],
  },
  {
    title: "매콤 비빔국수",
    content:
      "양념이 새콤달콤 매콤해서 계속 생각나는 비빔국수예요. 면발이 쫄깃하고 양도 넉넉합니다. 점심때는 조금 붐비지만 회전이 빨라 오래 기다리진 않았어요.",
    address: "서울특별시 구로구 구로동 1126",
    lat: 37.485264,
    lng: 126.901401,
    images: [
      "https://images.unsplash.com/photo-1728657824943-8ef95b197b98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    ],
  },
  {
    title: "시흥 손칼국수",
    content:
      "손으로 직접 뽑은 면발이 쫄깃하고 국물이 진해요. 붐비지 않는 시간대에 가면 여유롭게 먹을 수 있습니다. 겉절이가 특히 맛있었어요.",
    address: "서울특별시 금천구 시흥동 950",
    lat: 37.4565,
    lng: 126.9046,
    images: [
      "https://images.unsplash.com/photo-1572268152063-4a744292db1b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    ],
  },
  {
    title: "문래 작은 화덕",
    content:
      "장작 화덕에 구워 도우가 담백하고 쫄깃해요. 작은 가게라 아늑하고 데이트하기도 좋습니다. 마르게리타가 특히 훌륭했어요.",
    address: "서울특별시 영등포구 문래동3가 55",
    lat: 37.5175,
    lng: 126.8955,
    images: [
      "https://images.unsplash.com/photo-1716237387585-04dfe90040dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    ],
  },
  {
    title: "개봉 골목 브런치",
    content:
      "골목 안쪽 조용한 카페인데 햇살이 잘 들어와요. 브런치 플레이트가 정갈하고 커피도 향이 좋습니다. 주말 오전에 특히 여유로워요.",
    address: "서울특별시 구로구 개봉동 145",
    lat: 37.4946,
    lng: 126.8583,
    images: ["/samples/food-1.png"],
  },
  {
    title: "구로 옛날 손만두",
    content:
      "매일 아침 직접 빚는 손만두라 속이 꽉 차 있어요. 김치만두와 고기만두 둘 다 훌륭하고, 아이들도 잘 먹었습니다. 포장 손님도 많아요.",
    address: "서울특별시 구로구 구로동 636",
    lat: 37.5033,
    lng: 126.8827,
    images: ["/samples/food-2.png"],
  },
];

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** `public/` 안쪽으로만 읽는다. 시드 목록은 우리가 쓰지만 경로 조립은 습관을 지킨다. */
async function loadLocal(source: string): Promise<File> {
  const publicDir = path.join(process.cwd(), "public");
  const resolved = path.resolve(publicDir, `.${source}`);
  if (!resolved.startsWith(publicDir + path.sep)) {
    throw new Error(`public 밖의 경로: ${source}`);
  }

  const type = MIME_BY_EXTENSION[path.extname(resolved).toLowerCase()];
  if (!type) throw new Error(`확장자를 알 수 없음: ${source}`);

  const bytes = await readFile(resolved);
  return new File([new Uint8Array(bytes)], path.basename(resolved), { type });
}

async function loadRemote(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지를 못 받음 (${res.status}): ${url}`);

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(type)) {
    throw new Error(`허용되지 않는 형식(${type || "unknown"}): ${url}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  return new File([bytes], `${new URL(url).pathname.split("/").pop() || "seed"}.jpg`, { type });
}

function loadImage(source: string): Promise<File> {
  return source.startsWith("http") ? loadRemote(source) : loadLocal(source);
}

/**
 * 주소창에서 바로 열 수 있게 GET 도 받는다.
 *
 * 보통 GET 은 뭘 바꾸면 안 되지만, 이건 개발에서만 살아 있고 사용자가 직접 주소를 치는
 * 일회용 시드다. 이미 글이 있으면 아무것도 하지 않으므로 새로고침해도 안전하다.
 */
export async function GET() {
  return POST();
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return fail(404, "not_found", "없는 경로입니다.");
  }

  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return unauthorized();

  // 두 번 눌러서 같은 맛집이 열두 개가 되는 걸 막는다.
  const existing = await supabase.from("place").select("id", { count: "exact", head: true });
  if (existing.error) return fromSupabaseError(existing.error, "dev/seed:count");
  if ((existing.count ?? 0) > 0) {
    return ok({
      seeded: 0,
      skipped: SEEDS.length,
      message: `이미 맛집이 ${existing.count}건 있어서 건너뛰었습니다.`,
    });
  }

  const created: string[] = [];
  const failed: { title: string; reason: string }[] = [];

  for (const seed of SEEDS) {
    try {
      const files = await Promise.all(seed.images.map(loadImage));
      const result = await insertPlaceWithImages(supabase, userId, {
        title: seed.title,
        content: seed.content,
        location: {
          address: seed.address,
          name: seed.title,
          lat: seed.lat,
          lng: seed.lng,
        },
        files,
      });

      if (!result.ok) {
        const body = (await result.response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        failed.push({ title: seed.title, reason: body?.error?.message ?? "등록 실패" });
        continue;
      }
      created.push(seed.title);
    } catch (error) {
      failed.push({ title: seed.title, reason: (error as Error).message });
    }
  }

  return ok({ seeded: created.length, created, failed });
}
