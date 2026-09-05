import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트.
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 필요합니다.
 * (.env.local.example 참고)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
