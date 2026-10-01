import { NextResponse } from "next/server";
import { sendDueDayBeforeReminders } from "@/lib/notifications/reminders";
import { archiveOldConsultations } from "@/lib/admin/archive";

/**
 * Vercel Cron이 매일 호출하는 엔드포인트 (vercel.json 참고).
 * 무료 요금제의 크론 작업 개수 제한 때문에, 매일 한 번 해도 되는 소소한 작업들을
 * (리마인드 발송, 지난 예약 자동 보관 등) 여기 한 곳에 모아 같이 처리한다.
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

  const reminders = await sendDueDayBeforeReminders();
  const archive = await archiveOldConsultations();
  return NextResponse.json({ ok: true, reminders, archive });
}
