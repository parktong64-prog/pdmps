import { NextResponse } from "next/server";
import { sendReservationNotificationEmail } from "@/lib/notifications/email";

// 임시 테스트용 엔드포인트. 확인 후 반드시 제거할 것.
export async function GET() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY 미설정" });
  }
  await sendReservationNotificationEmail({ name: "테스트환자", date: "2026년 9월 8일(화)", time: "14:00" });
  return NextResponse.json({ ok: true, sent: true });
}
