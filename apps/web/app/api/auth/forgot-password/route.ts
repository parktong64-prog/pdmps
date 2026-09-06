import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 비밀번호 재설정 이메일 발송을 서버에서 대신 처리한다.
 * 브라우저에서 직접 supabase-js의 resetPasswordForEmail()을 호출하면
 * 이 배포 환경에서 간헐적으로 "non ISO-8859-1 code point" fetch 에러가
 * 발생하는 문제가 있어(원인 불명, 브라우저 fetch/Headers 관련 추정),
 * 동일한 요청을 서버(Node 런타임)에서 대신 보내 우회한다.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const supabase = createAdminClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    const isRateLimited = error.status === 429 || error.code === "over_email_send_rate_limit";
    return NextResponse.json(
      { error: isRateLimited ? "이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요." : error.message },
      { status: isRateLimited ? 429 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
