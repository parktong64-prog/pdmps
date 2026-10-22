import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { kstParts, kstMidnightUTC } from "@/lib/admin/time";
import { alimtalkLabels, kstDateTimeKey } from "@/lib/booking";
import { hasReminderD7Template, sendReminderD1Alimtalk, sendReminderD7Alimtalk } from "./alimtalk";

type Delivery = { ok: true } | { ok: false; error: string };
type Reminder = {
  /** 예약일이 오늘로부터 며칠 뒤인 예약에 보낼지 */
  daysAhead: number;
  /** notifications에 남기는 키. 같은 예약에 같은 키가 이미 있으면 다시 보내지 않는다. */
  templateKey: "reminder_d1" | "reminder_d7";
  channel: "alimtalk" | "sms";
  deliver: (v: { phone: string; startAt: string }) => Promise<Delivery>;
  label: string;
};

type Result = { sent: number; failed: number; skipped: number };

async function sendReminders(r: Reminder): Promise<Result> {
  const supabase = createAdminClient();
  const { y, m, day } = kstParts();
  const from = kstMidnightUTC(y, m, day + r.daysAhead);
  const to = kstMidnightUTC(y, m, day + r.daysAhead + 1);

  const { data, error } = await supabase
    .from("reservations")
    .select("id, patient_id, consultation_id, reservation_slots!inner(start_at), patients(phone)")
    .eq("status", "confirmed")
    .gte("reservation_slots.start_at", from.toISOString())
    .lt("reservation_slots.start_at", to.toISOString());

  if (error || !data || data.length === 0) return { sent: 0, failed: 0, skipped: 0 };

  const { data: already } = await supabase
    .from("notifications")
    .select("reservation_id")
    .eq("template_key", r.templateKey)
    .in(
      "reservation_id",
      data.map((row) => row.id),
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

    const result = await r.deliver({ phone: patientObj.phone, startAt });

    // notifications에는 받는 환자(recipient_patient_id)가 반드시 있어야 한다(DB 제약).
    // 기록이 저장되지 않으면 중복 발송 방지와 발송 이력 확인이 모두 깨지므로 실패를 로그로 남긴다.
    const { error: logErr } = await supabase.from("notifications").insert({
      reservation_id: row.id,
      consultation_id: row.consultation_id,
      recipient_patient_id: row.patient_id,
      channel: r.channel,
      template_key: r.templateKey,
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
    if (logErr) console.error(`${r.label} 발송 기록 저장 실패:`, logErr.message);

    if (result.ok) sent++;
    else {
      failed++;
      console.error(`${r.label} 발송 실패:`, result.error);
    }
  }

  return { sent, failed, skipped };
}

/**
 * 내일 확정된 예약에 리마인드 알림톡을 보낸다. 매일 한 번(크론)으로 호출된다.
 * 온라인 예약과 관리자가 직접 등록한 예약을 구분하지 않고 확정된 예약 전체가 대상이다.
 */
export function sendDueDayBeforeReminders(): Promise<Result> {
  return sendReminders({
    daysAhead: 1,
    templateKey: "reminder_d1",
    channel: "alimtalk",
    label: "전날 안내",
    deliver: ({ startAt, phone }) => sendReminderD1Alimtalk({ phone, time: kstDateTimeKey(startAt).time }),
  });
}

/**
 * 일주일 뒤 확정된 예약에 알림톡으로 안내한다. 일주일 전 알림톡 템플릿(SOLAPI_TEMPLATE_REMINDER_D7)이
 * 승인·등록되기 전에는 문자로 대신 보내지 않고 아무것도 보내지 않는다(요청에 따라 문자 발송 없음).
 */
export function sendDueWeekBeforeReminders(): Promise<Result> {
  if (!hasReminderD7Template()) return Promise.resolve({ sent: 0, failed: 0, skipped: 0 });
  return sendReminders({
    daysAhead: 7,
    templateKey: "reminder_d7",
    channel: "alimtalk",
    label: "일주일 전 안내",
    deliver: ({ startAt, phone }) => {
      const { dateLabel, timeLabel } = alimtalkLabels(startAt);
      return sendReminderD7Alimtalk({ phone, date: dateLabel, time: timeLabel });
    },
  });
}
