import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트/라우트 핸들러에서 사용하는 Supabase 클라이언트.
 * Server Component에서는 쿠키를 쓸 수 없으므로 setAll 실패는 무시합니다
 * (미들웨어에서 세션 갱신을 처리하는 것을 전제로 함).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출된 경우 — 미들웨어가 세션을 갱신하므로 무시해도 안전
          }
        },
      },
    },
  );
}
