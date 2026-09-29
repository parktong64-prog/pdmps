import { NextResponse } from "next/server";
import { sendDueDayBeforeReminders } from "@/lib/notifications/reminders";

/**
 * Vercel Cron이 매일 호출하는 엔드포인트 (vercel.json 참고).
 * CRON_SECRET을 설정해두면 Vercel이 요청에 `Authorization: Bearer <값>`을 자동으로
 * 붙여주므로, 그 값을 대조해 외부에서 함부로 호출하지 못하게 막는다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendDueDayBeforeReminders();
  return NextResponse.json({ ok: true, ...result });
}
