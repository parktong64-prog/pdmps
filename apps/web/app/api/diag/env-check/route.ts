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
    NEXT_PUBLIC_SUPABASE_URL: check("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: check("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: check("SUPABASE_SERVICE_ROLE_KEY"),
    GEMINI_API_KEY: check("GEMINI_API_KEY"),
    TOSS_SECRET_KEY: check("TOSS_SECRET_KEY"),
  });
}
