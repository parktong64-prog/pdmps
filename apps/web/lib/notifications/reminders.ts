import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { kstParts, kstMidnightUTC } from "@/lib/admin/time";
import { kstDateTimeKey } from "@/lib/booking";
import { sendReminderD1Alimtalk } from "./alimtalk";

/**
 * 내일 확정된 예약에 리마인드 알림톡을 보낸다. 매일 한 번(크론)으로 호출된다.
 * 같은 예약에 두 번 보내지 않도록, notifications 테이블에 template_key='reminder_d1'
 * 기록이 이미 있는 예약은 건너뛴다.
 */
export async function sendDueDayBeforeReminders(): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = createAdminClient();
  const { y, m, day } = kstParts();
  const tomorrowStart = kstMidnightUTC(y, m, day + 1);
  const dayAfterStart = kstMidnightUTC(y, m, day + 2);

  const { data, error } = await supabase
    .from("reservations")
    .select("id, patient_id, consultation_id, reservation_slots!inner(start_at), patients(phone)")
    .eq("status", "confirmed")
    .gte("reservation_slots.start_at", tomorrowStart.toISOString())
    .lt("reservation_slots.start_at", dayAfterStart.toISOString());

  if (error || !data || data.length === 0) return { sent: 0, failed: 0, skipped: 0 };

  const { data: already } = await supabase
    .from("notifications")
    .select("reservation_id")
    .eq("template_key", "reminder_d1")
    .in(
      "reservation_id",
      data.map((r) => r.id),
    );
  const alreadySent = new Set((already ?? []).map((n) => n.reservation_id as string));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of data) {
    if (alreadySent.has(row.id)) {
      skipped++;
      continue;
    }

    const slot = row.reservation_slots as unknown as { start_at: string } | { start_at: string }[] | null;
    const startAt = Array.isArray(slot) ? slot[0]?.start_at : slot?.start_at;
    const patient = row.patients as unknown as { phone: string } | { phone: string }[] | null;
    const patientObj = Array.isArray(patient) ? patient[0] : patient;

    if (!startAt || !patientObj?.phone) {
      skipped++;
      continue;
    }

    const { time } = kstDateTimeKey(startAt);
    const result = await sendReminderD1Alimtalk({ phone: patientObj.phone, time });

    // notifications에는 받는 환자(recipient_patient_id)가 반드시 있어야 한다(DB 제약).
    // 기록이 저장되지 않으면 중복 발송 방지와 발송 이력 확인이 모두 깨지므로 실패를 로그로 남긴다.
    const { error: logErr } = await supabase.from("notifications").insert({
      reservation_id: row.id,
      consultation_id: row.consultation_id,
      recipient_patient_id: row.patient_id,
      channel: "alimtalk",
      template_key: "reminder_d1",
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
    if (logErr) console.error("리마인드 발송 기록 저장 실패:", logErr.message);

    if (result.ok) sent++;
    else {
      failed++;
      console.error("리마인드 알림톡 발송 실패:", result.error);
    }
  }

  return { sent, failed, skipped };
}
