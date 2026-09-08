import "server-only";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_TO = "parktong64@gmail.com";
const FROM = "PDMPS 예약알림 <onboarding@resend.dev>";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * 예약(결제) 확정 시 관리자에게 알림 이메일을 보낸다.
 * Resend API 사용 — RESEND_API_KEY가 없으면 조용히 넘어간다(예약 처리 자체를 막지 않기 위함).
 * 실패해도 예외를 던지지 않는다 — 알림은 부가 기능이라 예약 확정 흐름을 절대 막으면 안 된다.
 */
export async function sendReservationNotificationEmail(params: { name: string; phone: string; date: string; time: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const to = process.env.RESERVATION_NOTIFY_EMAIL || DEFAULT_TO;

  try {
    await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `[PDMPS] 새 예약 - ${params.name}님 (${params.date} ${params.time})`,
        html: `
          <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:15px;line-height:1.7;color:#1c2b3a;">
            <h2 style="margin-bottom:16px;">새로운 상담 예약이 접수되었습니다</h2>
            <table style="border-collapse:collapse;">
              <tr><td style="padding:4px 14px 4px 0;font-weight:bold;">이름</td><td style="padding:4px 0;">${escapeHtml(params.name)}</td></tr>
              <tr><td style="padding:4px 14px 4px 0;font-weight:bold;">전화번호</td><td style="padding:4px 0;">${escapeHtml(params.phone)}</td></tr>
              <tr><td style="padding:4px 14px 4px 0;font-weight:bold;">예약일</td><td style="padding:4px 0;">${escapeHtml(params.date)}</td></tr>
              <tr><td style="padding:4px 14px 4px 0;font-weight:bold;">시간</td><td style="padding:4px 0;">${escapeHtml(params.time)}</td></tr>
            </table>
          </div>
        `,
      }),
    });
  } catch {
    // 알림 발송 실패는 무시 — 예약 확정 자체는 이미 완료된 상태
  }
}
