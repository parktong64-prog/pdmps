import { NextResponse } from "next/server";

// 임시 진단용 엔드포인트. 실제 값은 절대 노출하지 않고
// 존재 여부/길이/비ASCII 문자 포함 여부만 확인한다. 확인 후 반드시 제거할 것.
function check(name: string) {
  const v = process.env[name];
  if (v === undefined) return { set: false };
  let badAt = -1;
  for (let i = 0; i < v.length; i++) {
    if (v.charCodeAt(i) > 255) {
      badAt = i;
      break;
    }
  }
  return {
    set: true,
    len: v.length,
    badAt,
    startsWith: v.slice(0, 6),
    endsWith: v.slice(-6),
  };
}

export async function GET() {
  return NextResponse.json({
    TOSS_SECRET_KEY: check("TOSS_SECRET_KEY"),
    NEXT_PUBLIC_TOSS_CLIENT_KEY: check("NEXT_PUBLIC_TOSS_CLIENT_KEY"),
    RESEND_API_KEY: check("RESEND_API_KEY"),
  });
}
