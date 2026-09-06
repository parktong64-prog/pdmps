import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * 비밀번호 재설정(및 다른 이메일 인증) 링크의 서버 측 콜백.
 * token_hash를 서버에서 세션으로 교환해 쿠키에 저장한 뒤 next로 이동시킨다.
 * 클라이언트에서 URL 해시(#access_token=...)를 직접 파싱하는 방식은
 * @supabase/ssr 브라우저 클라이언트에서 안정적으로 동작하지 않아 이 방식을 사용한다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  if (searchParams.get("envcheck") === "1") {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    let badAt = -1;
    for (let i = 0; i < anon.length; i++) {
      if (anon.charCodeAt(i) > 255) {
        badAt = i;
        break;
      }
    }
    return NextResponse.json({ len: anon.length, badAt, tail: anon.slice(-10) });
  }

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/reset-password";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
}
