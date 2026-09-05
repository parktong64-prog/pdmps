import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 관리자 Supabase 클라이언트 (service_role 키 사용).
 * RLS(Row Level Security)를 우회하므로 절대 클라이언트 컴포넌트나 브라우저로
 * 값이 전달되면 안 됩니다. Route Handler / Server Action / Server Component에서만 사용하세요.
 *
 * 현재는 관리자 인증(로그인)이 없는 상태라, 관리자 화면(/admin/*)의 데이터 조회·수정과
 * 예약/결제 확정처럼 RLS 정책을 넘어서야 하는 서버 로직에 씁니다.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
