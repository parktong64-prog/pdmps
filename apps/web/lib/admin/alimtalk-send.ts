"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAlimtalk } from "@/lib/notifications/alimtalk";
import { MANUAL_TEMPLATES } from "@/lib/notifications/manual-templates";
import { normalizePhone } from "@/lib/phone-extract";
import { alimtalkLabels } from "@/lib/booking";
import { sendSms, senderPhoneMasked } from "@/lib/notifications/sms";
import {
  HOSPITAL_PREFIX,
  TEXT_MAX_BYTES,
  fillPlaceholders,
  hasPlaceholders,
  smsByteLength,
} from "@/lib/notifications/text-utils";
import { kstParts, kstMidnightUTC } from "@/lib/admin/time";

// 한 번의 서버 호출에서 처리할 최대 건수 (서버 실행 시간 제한을 넘지 않게 화면에서 나눠서 보낸다).
const MAX_PER_CALL = 10;
const MAX_VALUE_LEN = 40;
const CONCURRENCY = 5;

// 서버 액션은 주소만 알면 바깥에서도 호출될 수 있으므로, 발송처럼 비용이 드는 작업은
// 미들웨어에만 맡기지 않고 여기서 관리자 로그인을 한 번 더 확인한다.
async function requireAdmin(): Promise<{ ok: true; email: string } | { ok: false }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { ok: true, email: data.user.email ?? "" } : { ok: false };
}

export type ManualTemplateInfo = { key: string; available: boolean };

/** 어떤 템플릿이 실제로 발송 가능한지(템플릿 ID가 등록되어 있는지) 알려준다. */
export async function getTemplateAvailability(): Promise<ManualTemplateInfo[]> {
  if (!(await requireAdmin()).ok) return [];
  return MANUAL_TEMPLATES.map((t) => ({ key: t.key, available: !!process.env[t.envVar] }));
}

export type PatientOption = { id: string; name: string; phone: string };

/** 보관 처리되지 않은 환자 목록 (발송 대상 선택용). */
export async function listPatientsForSend(): Promise<PatientOption[]> {
  if (!(await requireAdmin()).ok) return [];
  const { data } = await createAdminClient()
    .from("patients")
    .select("id, name, phone")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({ id: p.id as string, name: p.name as string, phone: p.phone as string }));
}

export type BatchResult = { ok: boolean; sent: number; failed: { phone: string; reason: string }[]; error?: string };

export async function sendAlimtalkBatch(input: {
  templateKey: string;
  variables: Record<string, string>;
  phones: string[];
}): Promise<BatchResult> {
  if (!(await requireAdmin()).ok) return { ok: false, sent: 0, failed: [], error: "로그인이 필요합니다." };

  const template = MANUAL_TEMPLATES.find((t) => t.key === input.templateKey);
  if (!template) return { ok: false, sent: 0, failed: [], error: "알 수 없는 템플릿입니다." };
  const templateId = process.env[template.envVar];
  if (!templateId) return { ok: false, sent: 0, failed: [], error: "이 템플릿은 아직 발송 설정이 되어 있지 않습니다." };

  const variables: Record<string, string> = {};
  for (const v of template.variables) {
    const value = (input.variables[v.name] ?? "").trim();
    if (!value) return { ok: false, sent: 0, failed: [], error: `"${v.label}" 값을 입력해주세요.` };
    if (value.length > MAX_VALUE_LEN || /[\r\n]/.test(value)) {
      return { ok: false, sent: 0, failed: [], error: `"${v.label}" 값이 너무 길거나 줄바꿈이 있습니다.` };
    }
    variables[`#{${v.name}}`] = value;
  }

  const phones = [...new Set(input.phones.map((p) => normalizePhone(p)).filter((p): p is string => !!p))];
  if (phones.length === 0) return { ok: false, sent: 0, failed: [], error: "보낼 번호가 없습니다." };
  if (phones.length > MAX_PER_CALL) return { ok: false, sent: 0, failed: [], error: "한 번에 보낼 수 있는 건수를 넘었습니다." };

  const failed: { phone: string; reason: string }[] = [];
  let sent = 0;
  let next = 0;
  async function worker() {
    while (next < phones.length) {
      const phone = phones[next++];
      const res = await sendAlimtalk({ to: phone, templateId: templateId!, variables });
      if (res.ok) sent++;
      else failed.push({ phone, reason: res.error.slice(0, 120) });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, phones.length) }, worker));
  return { ok: true, sent, failed };
}

/** 발송이 끝난 뒤 요약(누가·언제·무엇을·몇 건)만 남긴다. 받는 사람 번호는 저장하지 않는다. */
export async function recordBroadcast(input: {
  templateKey: string;
  variables: Record<string, string>;
  total: number;
  success: number;
  failed: number;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false };
  const { error } = await createAdminClient().from("alimtalk_broadcasts").insert({
    template_key: input.templateKey,
    variables: input.variables,
    total: input.total,
    success: input.success,
    failed: input.failed,
    sent_by: auth.email,
  });
  return { ok: !error };
}

// ───────────────────────── 예약 환자에게 보내기 ─────────────────────────
// 날짜·시간은 화면에서 받지 않고 예약 번호로 서버가 직접 조회해 채운다 (사람마다 다르고, 잘못 입력할 수 없게).

export type ReservationOption = {
  id: string;
  name: string;
  phoneMasked: string;
  dateLabel: string;
  timeLabel: string;
  isTomorrow: boolean;
  /** 이미 성공적으로 발송된 템플릿 키 목록 */
  sent: string[];
};

const maskName = (n: string) => (n ? `${n[0]}${"*".repeat(Math.max(1, n.length - 1))}` : "-");
const maskPhone = (p: string) => p.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, "$1-****-$3");

type ResvRow = {
  id: string;
  patient_id: string;
  consultation_id: string;
  patients: { name: string; phone: string } | { name: string; phone: string }[] | null;
  reservation_slots: { start_at: string } | { start_at: string }[] | null;
};

function unpack(r: ResvRow) {
  const p = Array.isArray(r.patients) ? r.patients[0] : r.patients;
  const s = Array.isArray(r.reservation_slots) ? r.reservation_slots[0] : r.reservation_slots;
  return { name: p?.name ?? "", phone: p?.phone ?? "", startAt: s?.start_at ?? "" };
}

function tomorrowRange() {
  const { y, m, day } = kstParts();
  return { from: kstMidnightUTC(y, m, day + 1).getTime(), to: kstMidnightUTC(y, m, day + 2).getTime() };
}

/** 앞으로 예정된 확정 예약 목록 (가까운 순). */
export async function listUpcomingReservations(): Promise<ReservationOption[]> {
  if (!(await requireAdmin()).ok) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reservations")
    .select("id, patient_id, consultation_id, patients(name, phone), reservation_slots!inner(start_at)")
    .eq("status", "confirmed")
    .gte("reservation_slots.start_at", new Date().toISOString())
    .limit(300);
  const rows = (data ?? []) as unknown as ResvRow[];
  if (rows.length === 0) return [];

  const { data: logs } = await supabase
    .from("notifications")
    .select("reservation_id, template_key")
    .eq("status", "sent")
    .in("reservation_id", rows.map((r) => r.id));
  const sentMap = new Map<string, string[]>();
  for (const l of logs ?? []) {
    const k = l.reservation_id as string;
    sentMap.set(k, [...(sentMap.get(k) ?? []), l.template_key as string]);
  }

  const tm = tomorrowRange();
  return rows
    .map((r) => ({ r, u: unpack(r) }))
    .filter((x) => x.u.startAt)
    .sort((a, b) => (a.u.startAt < b.u.startAt ? -1 : 1))
    .map(({ r, u }) => {
      const ms = new Date(u.startAt).getTime();
      const { dateLabel, timeLabel } = alimtalkLabels(u.startAt);
      return {
        id: r.id,
        name: u.name,
        phoneMasked: maskPhone(u.phone),
        dateLabel,
        timeLabel,
        isTomorrow: ms >= tm.from && ms < tm.to,
        sent: sentMap.get(r.id) ?? [],
      };
    });
}

export async function sendAlimtalkToReservations(input: { templateKey: string; reservationIds: string[] }): Promise<BatchResult> {
  if (!(await requireAdmin()).ok) return { ok: false, sent: 0, failed: [], error: "로그인이 필요합니다." };

  const template = MANUAL_TEMPLATES.find((t) => t.key === input.templateKey);
  if (!template) return { ok: false, sent: 0, failed: [], error: "알 수 없는 템플릿입니다." };
  const templateId = process.env[template.envVar];
  if (!templateId) return { ok: false, sent: 0, failed: [], error: "이 템플릿은 아직 발송 설정이 되어 있지 않습니다." };

  const ids = [...new Set(input.reservationIds)];
  if (ids.length === 0) return { ok: false, sent: 0, failed: [], error: "선택한 예약이 없습니다." };
  if (ids.length > MAX_PER_CALL) return { ok: false, sent: 0, failed: [], error: "한 번에 보낼 수 있는 건수를 넘었습니다." };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reservations")
    .select("id, patient_id, consultation_id, patients(name, phone), reservation_slots!inner(start_at)")
    .eq("status", "confirmed")
    .in("id", ids);
  const rows = (data ?? []) as unknown as ResvRow[];
  const tm = tomorrowRange();

  const jobs: { row: ResvRow; label: string; phone: string; variables: Record<string, string> }[] = [];
  const failed: { phone: string; reason: string }[] = [];

  for (const id of ids) {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      failed.push({ phone: "(알 수 없는 예약)", reason: "확정된 예약이 아니거나 찾을 수 없습니다." });
      continue;
    }
    const u = unpack(row);
    const label = `${maskName(u.name)} ${maskPhone(u.phone)}`;
    const ms = new Date(u.startAt).getTime();
    const phone = normalizePhone(u.phone);
    if (!phone) {
      failed.push({ phone: label, reason: "휴대폰 번호 형식이 올바르지 않습니다." });
      continue;
    }
    if (input.templateKey === "reminder_d1" && !(ms >= tm.from && ms < tm.to)) {
      failed.push({ phone: label, reason: "내일 예약이 아니어서 보낼 수 없습니다." });
      continue;
    }
    const { dateLabel, timeLabel } = alimtalkLabels(u.startAt);
    const variables: Record<string, string> = {};
    let unsupported = "";
    for (const v of template.variables) {
      if (v.name === "날짜") variables[`#{${v.name}}`] = dateLabel;
      else if (v.name === "시간") variables[`#{${v.name}}`] = timeLabel;
      else unsupported = v.label;
    }
    if (unsupported) {
      failed.push({ phone: label, reason: `"${unsupported}" 값은 예약 정보로 자동 입력할 수 없습니다.` });
      continue;
    }
    jobs.push({ row, label, phone, variables });
  }

  let sent = 0;
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      const res = await sendAlimtalk({ to: job.phone, templateId: templateId!, variables: job.variables });
      if (res.ok) sent++;
      else failed.push({ phone: job.label, reason: res.error.slice(0, 120) });
      // 발송 이력과 중복 발송 방지(전날 안내)를 위해 환자별로 남긴다.
      const { error } = await supabase.from("notifications").insert({
        reservation_id: job.row.id,
        consultation_id: job.row.consultation_id,
        recipient_patient_id: job.row.patient_id,
        channel: "alimtalk",
        template_key: input.templateKey,
        status: res.ok ? "sent" : "failed",
        sent_at: res.ok ? new Date().toISOString() : null,
      });
      if (error) console.error("알림톡 발송 기록 저장 실패:", error.message);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  return { ok: true, sent, failed };
}

// ───────────────────────── 문자(SMS/LMS) 직접 작성 ─────────────────────────
// 알림톡은 승인된 문구만 보낼 수 있어서, 자유 문구는 문자로 보낸다. 정보성(예약·진료 안내) 용도만 허용한다.

function composeText(raw: string, withPrefix: boolean, values: { 이름?: string; 날짜?: string; 시간?: string }) {
  const body = fillPlaceholders(raw.trim(), values);
  return withPrefix && !body.startsWith("[") ? `${HOSPITAL_PREFIX}${body}` : body;
}

/** 문자 발송 화면에 보여줄 발신번호(일부 가림). */
export async function getSmsSender(): Promise<string | null> {
  if (!(await requireAdmin()).ok) return null;
  return senderPhoneMasked();
}

export async function sendTextBatch(input: { text: string; withPrefix: boolean; phones: string[] }): Promise<BatchResult> {
  if (!(await requireAdmin()).ok) return { ok: false, sent: 0, failed: [], error: "로그인이 필요합니다." };
  const raw = input.text.trim();
  if (!raw) return { ok: false, sent: 0, failed: [], error: "문구를 입력해주세요." };
  if (hasPlaceholders(raw)) {
    return { ok: false, sent: 0, failed: [], error: "{이름} {날짜} {시간}은 '예약 환자 선택'에서만 쓸 수 있습니다." };
  }
  const text = composeText(raw, input.withPrefix, {});
  if (smsByteLength(text) > TEXT_MAX_BYTES) return { ok: false, sent: 0, failed: [], error: "문구가 너무 깁니다." };

  const phones = [...new Set(input.phones.map((p) => normalizePhone(p)).filter((p): p is string => !!p))];
  if (phones.length === 0) return { ok: false, sent: 0, failed: [], error: "보낼 번호가 없습니다." };
  if (phones.length > MAX_PER_CALL) return { ok: false, sent: 0, failed: [], error: "한 번에 보낼 수 있는 건수를 넘었습니다." };

  const failed: { phone: string; reason: string }[] = [];
  let sent = 0;
  let next = 0;
  async function worker() {
    while (next < phones.length) {
      const phone = phones[next++];
      const res = await sendSms({ to: phone, text });
      if (res.ok) sent++;
      else failed.push({ phone, reason: res.error.slice(0, 120) });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, phones.length) }, worker));
  return { ok: true, sent, failed };
}

export async function sendTextToReservations(input: {
  text: string;
  withPrefix: boolean;
  reservationIds: string[];
}): Promise<BatchResult> {
  if (!(await requireAdmin()).ok) return { ok: false, sent: 0, failed: [], error: "로그인이 필요합니다." };
  const raw = input.text.trim();
  if (!raw) return { ok: false, sent: 0, failed: [], error: "문구를 입력해주세요." };

  const ids = [...new Set(input.reservationIds)];
  if (ids.length === 0) return { ok: false, sent: 0, failed: [], error: "선택한 예약이 없습니다." };
  if (ids.length > MAX_PER_CALL) return { ok: false, sent: 0, failed: [], error: "한 번에 보낼 수 있는 건수를 넘었습니다." };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reservations")
    .select("id, patient_id, consultation_id, patients(name, phone), reservation_slots!inner(start_at)")
    .eq("status", "confirmed")
    .in("id", ids);
  const rows = (data ?? []) as unknown as ResvRow[];

  const jobs: { row: ResvRow; label: string; phone: string; text: string }[] = [];
  const failed: { phone: string; reason: string }[] = [];
  for (const id of ids) {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      failed.push({ phone: "(알 수 없는 예약)", reason: "확정된 예약이 아니거나 찾을 수 없습니다." });
      continue;
    }
    const u = unpack(row);
    const label = `${maskName(u.name)} ${maskPhone(u.phone)}`;
    const phone = normalizePhone(u.phone);
    if (!phone) {
      failed.push({ phone: label, reason: "휴대폰 번호 형식이 올바르지 않습니다." });
      continue;
    }
    const { dateLabel, timeLabel } = alimtalkLabels(u.startAt);
    const text = composeText(raw, input.withPrefix, { 이름: u.name, 날짜: dateLabel, 시간: timeLabel });
    if (smsByteLength(text) > TEXT_MAX_BYTES) {
      failed.push({ phone: label, reason: "문구가 너무 깁니다." });
      continue;
    }
    jobs.push({ row, label, phone, text });
  }

  let sent = 0;
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      const res = await sendSms({ to: job.phone, text: job.text });
      if (res.ok) sent++;
      else failed.push({ phone: job.label, reason: res.error.slice(0, 120) });
      const { error } = await supabase.from("notifications").insert({
        reservation_id: job.row.id,
        consultation_id: job.row.consultation_id,
        recipient_patient_id: job.row.patient_id,
        channel: "sms",
        template_key: "custom_text",
        status: res.ok ? "sent" : "failed",
        sent_at: res.ok ? new Date().toISOString() : null,
      });
      if (error) console.error("문자 발송 기록 저장 실패:", error.message);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  return { ok: true, sent, failed };
}
