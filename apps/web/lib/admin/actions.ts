"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { consultationStatusMeta, type StatusKey } from "@/lib/admin/status";
import {
  startOfTodayKST,
  startOfTomorrowKST,
  currentWeekRangeKST,
  currentMonthRangeKST,
  formatDateDotKST,
  formatDateTimeKST,
  kstMidnightUTC,
} from "@/lib/admin/time";
import { kstInstant, kstMidnightInstant, kstDateTimeKey, isClosedDay, TIMES } from "@/lib/booking";
import { expireStaleHeldReservations } from "@/lib/payments/toss";

const SLOT_DURATION_MIN = 90;
// 현재 단일 시술 · 단일 원장 체계이므로 seed.sql의 고정 id를 그대로 사용한다.
const DOCTOR_ID = "00000000-0000-0000-0000-000000000001";

function revenueLabel(sum: number) {
  if (sum >= 1_000_000) return `${(sum / 1_000_000).toFixed(1)}M`;
  return `${sum.toLocaleString()}원`;
}

// ───────────────────────── 대시보드 ─────────────────────────

export async function getDashboardData() {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStart = startOfTodayKST(now);
  const todayEnd = startOfTomorrowKST(now);
  const week = currentWeekRangeKST(now);
  const month = currentMonthRangeKST(now);

  const results = await Promise.all([
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", todayEnd.toISOString()),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .eq("status", "needs_review")
        .is("archived_at", null),
      supabase
        .from("consultations")
        .select("id, status, source, created_at, patients(name)")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("reservations")
        .select("id, status, reservation_slots!inner(start_at)")
        .gte("reservation_slots.start_at", week.start.toISOString())
        .lt("reservation_slots.start_at", week.end.toISOString()),
      supabase.from("payments").select("amount").eq("status", "paid").gte("paid_at", month.start.toISOString()).lt("paid_at", month.end.toISOString()),
    ]);
  const [{ count: todayNewConsultations }, { count: needsReviewCount }, { data: recentRows }, { data: weekReservations }, { data: monthPayments }] = results;

  const { count: todayReservations } = await supabase
    .from("reservations")
    .select("id, reservation_slots!inner(start_at)", { count: "exact", head: true })
    .eq("status", "confirmed")
    .gte("reservation_slots.start_at", todayStart.toISOString())
    .lt("reservation_slots.start_at", todayEnd.toISOString());

  const weekTotal = weekReservations?.length ?? 0;
  const weekNoShow = weekReservations?.filter((r) => r.status === "no_show").length ?? 0;
  const noShowRate = weekTotal > 0 ? Math.round((weekNoShow / weekTotal) * 1000) / 10 : 0;

  const monthRevenue = (monthPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const recent = (recentRows ?? []).map((r) => {
    const meta = consultationStatusMeta(r.status);
    const patient = r.patients as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(patient) ? patient[0]?.name : patient?.name;
    return {
      id: r.id as string,
      name: name ?? "-",
      meta: `${r.source === "app" ? "앱" : r.source === "admin" ? "관리자" : "웹"} · ${formatDateTimeKST(r.created_at as string)}`,
      status: meta.key,
      label: meta.label,
    };
  });

  // 이번 주 요일별 확정 예약 수 (월~일, 토·일은 정기 휴진)
  const weekLabel = ["월", "화", "수", "목", "금", "토", "일"];
  const weekCounts = new Array(7).fill(0);
  for (const r of weekReservations ?? []) {
    if (r.status !== "confirmed") continue;
    const slot = r.reservation_slots as unknown as { start_at: string } | { start_at: string }[] | null;
    const startAt = Array.isArray(slot) ? slot[0]?.start_at : slot?.start_at;
    if (!startAt) continue;
    const day = new Date(new Date(startAt).getTime() + 9 * 60 * 60 * 1000).getUTCDay(); // 0=일
    const idx = day === 0 ? 6 : day - 1; // 월=0 ... 일=6
    weekCounts[idx]++;
  }
  const week7 = weekLabel.map((d, i) => ({
    d,
    n: i >= 5 ? null : weekCounts[i], // 5:토, 6:일 = 휴진
    busy: i < 5 && weekCounts[i] >= 5,
  }));

  return {
    todayNewConsultations: todayNewConsultations ?? 0,
    todayReservations: todayReservations ?? 0,
    needsReviewCount: needsReviewCount ?? 0,
    noShowRate,
    monthRevenueLabel: revenueLabel(monthRevenue),
    recent,
    week: week7,
  };
}

// ───────────────────────── 상담 관리 ─────────────────────────

export type ConsultationRow = {
  id: string;
  name: string;
  channel: "웹" | "앱" | "관리자";
  status: StatusKey;
  statusLabel: string;
  date: string;
  flagged: boolean;
};

export async function getConsultations(options?: { includeArchived?: boolean }): Promise<ConsultationRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from("consultations").select("id, status, source, created_at, patients(name)");
  query = options?.includeArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((r) => {
    const meta = consultationStatusMeta(r.status);
    const patient = r.patients as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(patient) ? patient[0]?.name : patient?.name;
    return {
      id: r.id as string,
      name: name ?? "-",
      channel: r.source === "app" ? "앱" : r.source === "admin" ? "관리자" : "웹",
      status: meta.key,
      statusLabel: meta.label,
      date: formatDateDotKST(r.created_at as string),
      flagged: r.status === "needs_review",
    };
  });
}

/** 보관된 상담을 목록에 다시 노출한다 — 완전 삭제가 아니라 관리자가 실수로 가려졌을 때 되돌리는 용도. */
export async function restoreConsultation(consultationId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("consultations").update({ archived_at: null }).eq("id", consultationId);
  return { ok: !error };
}

// ───────────────────────── 예약 관리 (주간 그리드) ─────────────────────────

export type SlotCell = {
  status: "open" | "booked" | "blocked" | "pending";
  reservationId?: string;
  patientName?: string;
  patientPhone?: string;
  /** "admin"이면 관리자가 전화 등으로 직접 등록한 예약 — 온라인 예약(web/app)과 구분해서 보여준다. */
  source?: "web" | "app" | "admin";
};

/** weekStartISO(그 주 일요일 00:00 KST 기준 로컬 날짜)부터 7일치 슬롯 맵을 반환. key: `${dateKey}_${time}` */
export async function getWeekSlots(y: number, m: number, d: number): Promise<Record<string, SlotCell>> {
  // 결제 대기중 표시가 방치된 홀드 때문에 계속 남아있지 않도록, 조회할 때마다 만료분을 정리한다.
  await expireStaleHeldReservations();

  const supabase = createAdminClient();
  // y/m/d는 브라우저(KST)에서 뽑아낸 달력 날짜이므로, 서버(UTC)에서 그대로
  // new Date(y, m, d)로 만들면 안 되고 KST 자정 기준 절대 시각으로 변환해야 한다.
  const start = kstMidnightInstant(y, m, d);
  const end = kstMidnightInstant(y, m, d + 7);

  const { data, error } = await supabase
    .from("reservation_slots")
    .select("id, start_at, status, reservations(id, status, cancel_reason, patients(name, phone), consultations(source))")
    .eq("staff_id", DOCTOR_ID)
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString());

  if (error || !data) return {};

  const map: Record<string, SlotCell> = {};
  for (const row of data) {
    const { dateKey: dk, time: tk } = kstDateTimeKey(row.start_at as string);
    const key = `${dk}_${tk}`;
    const resv = row.reservations as unknown as
      | {
          id: string;
          status: string;
          patients: { name: string; phone: string } | { name: string; phone: string }[] | null;
          consultations: { source: string } | { source: string }[] | null;
        }
      | {
          id: string;
          status: string;
          patients: { name: string; phone: string } | { name: string; phone: string }[] | null;
          consultations: { source: string } | { source: string }[] | null;
        }[]
      | null;
    // 취소 후 다시 예약된 슬롯은 예약 행이 여러 개일 수 있으므로 취소되지 않은 것을 우선한다.
    const resvList = Array.isArray(resv) ? resv : resv ? [resv] : [];
    const reservation = resvList.find((r) => r.status !== "cancelled") ?? resvList[0];
    const patient = reservation?.patients;
    const patientObj = Array.isArray(patient) ? patient[0] : patient;
    const consultation = reservation?.consultations;
    const consultationObj = Array.isArray(consultation) ? consultation[0] : consultation;
    const source = consultationObj?.source as SlotCell["source"] | undefined;

    if (row.status === "booked" && reservation && reservation.status !== "cancelled") {
      map[key] = {
        status: "booked",
        reservationId: reservation.id,
        patientName: patientObj?.name,
        patientPhone: patientObj?.phone,
        source,
      };
    } else if (row.status === "held" && reservation && reservation.status === "pending_payment") {
      // 결제창으로 이동한 뒤 아직 승인되지 않은 슬롯 — 결제 대기중으로 표시
      map[key] = {
        status: "pending",
        reservationId: reservation.id,
        patientName: patientObj?.name,
        patientPhone: patientObj?.phone,
      };
    } else if (row.status === "blocked") {
      map[key] = { status: "blocked" };
    }
    // status === 'open' 이거나 취소되어 다시 열린 슬롯은 맵에 넣지 않음(=기본 "예약 가능")
  }
  return map;
}

function findSlotDate(dateStr: string, time: string) {
  // dateStr/time은 KST 기준 값이므로 kstInstant로 변환한다 — new Date(y, m-1, d, hh, mm)는
  // 서버(UTC)에서 그 벽시계 값을 UTC로 해석해버려 실제 저장된 시각과 9시간 어긋난다.
  const start = kstInstant(dateStr, time);
  const end = new Date(start.getTime() + SLOT_DURATION_MIN * 60 * 1000);
  return { start, end };
}

export async function cancelReservationSlot(dateStr: string, time: string) {
  const supabase = createAdminClient();
  const { start } = findSlotDate(dateStr, time);
  const { data: slot } = await supabase
    .from("reservation_slots")
    .select("id, reservations(id)")
    .eq("staff_id", DOCTOR_ID)
    .eq("start_at", start.toISOString())
    .maybeSingle();
  if (!slot) return { ok: false, error: "슬롯을 찾을 수 없습니다." };

  const resv = slot.reservations as unknown as { id: string } | { id: string }[] | null;
  const reservation = Array.isArray(resv) ? resv[0] : resv;
  if (reservation) {
    await supabase
      .from("reservations")
      .update({ status: "cancelled", cancel_reason: "관리자 취소" })
      .eq("id", reservation.id);
  }
  await supabase.from("reservation_slots").update({ status: "open" }).eq("id", slot.id);
  return { ok: true };
}

export async function blockSlot(dateStr: string, time: string) {
  const supabase = createAdminClient();
  const { start, end } = findSlotDate(dateStr, time);
  const { data: existing } = await supabase
    .from("reservation_slots")
    .select("id, status")
    .eq("staff_id", DOCTOR_ID)
    .eq("start_at", start.toISOString())
    .maybeSingle();

  if (existing) {
    if (existing.status === "booked") return { ok: false, error: "이미 예약이 있는 슬롯입니다." };
    await supabase.from("reservation_slots").update({ status: "blocked" }).eq("id", existing.id);
  } else {
    // procedures 테이블은 현재 단일 시술이므로 활성 시술 id를 조회해 넣는다.
    const { data: procedure } = await supabase.from("procedures").select("id").eq("is_active", true).limit(1).maybeSingle();
    await supabase.from("reservation_slots").insert({
      procedure_id: procedure?.id ?? null,
      staff_id: DOCTOR_ID,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "blocked",
    });
  }
  return { ok: true };
}

export async function reopenSlot(dateStr: string, time: string) {
  const supabase = createAdminClient();
  const { start } = findSlotDate(dateStr, time);
  await supabase
    .from("reservation_slots")
    .update({ status: "open" })
    .eq("staff_id", DOCTOR_ID)
    .eq("start_at", start.toISOString())
    .eq("status", "blocked");
  return { ok: true };
}

/** 전화번호 숫자만 뽑아 환자 예약 화면과 같은 하이픈 형식(010-1234-5678)으로 맞춘다. 형식이 안 맞으면 null. */
function normalizeKoreanMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const formatted =
    digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` :
    digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : null;
  return formatted && /^01[016789]-\d{3,4}-\d{4}$/.test(formatted) ? formatted : null;
}

/**
 * 관리자가 전화 등으로 받은 예약을 직접 등록한다. 결제 절차 없이 바로 '확정' 상태로 만든다
 * (예약금 결제 기록·알림톡은 남기지 않는다).
 */
export async function createAdminReservation(input: { dateStr: string; time: string; name: string; phone: string }) {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "이름을 입력해주세요." };
  const phone = normalizeKoreanMobile(input.phone);
  if (!phone) return { ok: false, error: "전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateStr) || !TIMES.includes(input.time)) {
    return { ok: false, error: "예약 일시가 올바르지 않습니다." };
  }

  const [dy, dm, dd] = input.dateStr.split("-").map(Number);
  if (isClosedDay(new Date(dy, dm - 1, dd))) return { ok: false, error: "휴진일에는 예약할 수 없습니다." };

  await expireStaleHeldReservations();

  const supabase = createAdminClient();
  const { start, end } = findSlotDate(input.dateStr, input.time);

  const { data: procedure } = await supabase.from("procedures").select("id").eq("is_active", true).limit(1).maybeSingle();
  if (!procedure) return { ok: false, error: "시술 정보를 찾을 수 없습니다." };

  const { data: existingSlot } = await supabase
    .from("reservation_slots")
    .select("id, status")
    .eq("staff_id", DOCTOR_ID)
    .eq("start_at", start.toISOString())
    .maybeSingle();
  if (existingSlot && existingSlot.status !== "open") {
    return { ok: false, error: "이미 예약되었거나 막혀 있는 시간입니다." };
  }

  const { data: patient, error: patientErr } = await supabase
    .from("patients")
    .upsert({ name, phone }, { onConflict: "phone" })
    .select("id")
    .single();
  if (patientErr || !patient) return { ok: false, error: "환자 정보 저장에 실패했습니다." };

  const { data: consultation, error: consultationErr } = await supabase
    .from("consultations")
    .insert({ patient_id: patient.id, procedure_id: procedure.id, status: "reserved", source: "admin" })
    .select("id")
    .single();
  if (consultationErr || !consultation) return { ok: false, error: "상담 정보 저장에 실패했습니다." };

  const rollbackConsultation = () => supabase.from("consultations").delete().eq("id", consultation.id);

  let slotId: string;
  if (existingSlot) {
    const { data: updated } = await supabase
      .from("reservation_slots")
      .update({ status: "booked" })
      .eq("id", existingSlot.id)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (!updated) {
      await rollbackConsultation();
      return { ok: false, error: "방금 다른 예약이 들어온 시간입니다. 새로고침 후 다시 시도해주세요." };
    }
    slotId = updated.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("reservation_slots")
      .insert({
        procedure_id: procedure.id,
        staff_id: DOCTOR_ID,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "booked",
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      await rollbackConsultation();
      return {
        ok: false,
        error: insertErr?.code === "23505" ? "방금 다른 예약이 들어온 시간입니다. 새로고침 후 다시 시도해주세요." : "예약 시간 등록에 실패했습니다.",
      };
    }
    slotId = inserted.id;
  }

  const { data: newReservation, error: reservationErr } = await supabase
    .from("reservations")
    .insert({
      slot_id: slotId,
      consultation_id: consultation.id,
      patient_id: patient.id,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (reservationErr || !newReservation) {
    await supabase.from("reservation_slots").update({ status: "open" }).eq("id", slotId);
    await rollbackConsultation();
    return { ok: false, error: "예약 생성에 실패했습니다." };
  }

  // 관리자 직접 등록도 다른 관리자·직원이 놓치지 않도록 동일하게 알림을 남긴다.
  await supabase.from("admin_alerts").insert({
    reservation_id: newReservation.id,
    message: `${name}님 예약 등록(관리자) · ${formatDateTimeKST(start.toISOString())}`,
  });

  return { ok: true };
}

export type SlotRef = { dateStr: string; time: string };

/** 여러 슬롯을 한 번에 막는다. 이미 예약된 슬롯 등 실패한 항목은 건너뛰고 첫 오류 메시지를 함께 돌려준다. */
export async function blockSlots(items: SlotRef[]) {
  const results = await Promise.all(items.map((it) => blockSlot(it.dateStr, it.time)));
  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, error: failed[0]?.error, failedCount: failed.length };
}

/** 여러 슬롯의 차단을 한 번에 푼다. */
export async function reopenSlots(items: SlotRef[]) {
  await Promise.all(items.map((it) => reopenSlot(it.dateStr, it.time)));
  return { ok: true };
}

// ───────────────────────── 환자 관리 ─────────────────────────

export type PatientListRow = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  reservations: number;
  last: string;
  needsReview: boolean;
};

export async function getPatientsList(options?: { includeArchived?: boolean }): Promise<PatientListRow[]> {
  const supabase = createAdminClient();
  let patientsQuery = supabase.from("patients").select("id, name, phone, created_at, archived_at");
  patientsQuery = options?.includeArchived
    ? patientsQuery.not("archived_at", "is", null)
    : patientsQuery.is("archived_at", null);

  const [{ data: patients }, { data: consultations }, { data: reservations }] = await Promise.all([
    patientsQuery,
    supabase.from("consultations").select("id, patient_id, status, created_at"),
    supabase.from("reservations").select("id, patient_id, created_at"),
  ]);
  if (!patients) return [];

  return patients
    .map((p) => {
      const myConsultations = (consultations ?? []).filter((c) => c.patient_id === p.id);
      const myReservations = (reservations ?? []).filter((r) => r.patient_id === p.id);
      // "최근 활동"은 실제 상담/예약 활동 기준. 둘 다 없으면 환자 등록일로 대체.
      const activityDates = [...myConsultations.map((c) => c.created_at as string), ...myReservations.map((r) => r.created_at as string)];
      const lastActivity = activityDates.length > 0 ? activityDates.sort().at(-1)! : (p.created_at as string);
      return {
        id: p.id as string,
        name: p.name as string,
        phone: p.phone as string,
        visits: myConsultations.length,
        reservations: myReservations.length,
        last: formatDateDotKST(lastActivity),
        lastActivityRaw: lastActivity,
        needsReview: myConsultations.some((c) => c.status === "needs_review"),
      };
    })
    .sort((a, b) => (a.lastActivityRaw < b.lastActivityRaw ? 1 : -1))
    .map(({ lastActivityRaw, ...rest }) => {
      void lastActivityRaw;
      return rest;
    });
}

/** 완전 삭제 대신 목록에서만 숨긴다 — 상담·예약·결제 이력은 보존됨. */
export async function archivePatient(patientId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("patients").update({ archived_at: new Date().toISOString() }).eq("id", patientId);
  return { ok: !error };
}

export async function restorePatient(patientId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("patients").update({ archived_at: null }).eq("id", patientId);
  return { ok: !error };
}

export type PatientDetail = {
  id: string;
  name: string;
  phone: string;
  archivedAt: string | null;
  visits: number;
  reservationsCount: number;
  concern: string;
  hope: string;
  history: string;
  ai: { severity: number; label: string; areas: string[]; needsReview: boolean; hasData: boolean };
  reservationList: { when: string; status: "confirmed" | "pending" | "cancelled"; label: string }[];
  paymentList: { type: string; amount: number; status: string; date: string }[];
  photos: number;
};

export async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  const supabase = createAdminClient();
  const { data: patient } = await supabase.from("patients").select("id, name, phone, archived_at").eq("id", patientId).single();
  if (!patient) return null;

  const { data: consultations } = await supabase
    .from("consultations")
    .select("id, status")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  const consultationIds = (consultations ?? []).map((c) => c.id as string);

  const { data: answers } = consultationIds.length
    ? await supabase
        .from("consultation_answers")
        .select("answer_text, questionnaire_fields(label)")
        .in("consultation_id", consultationIds)
    : { data: [] as { answer_text: string | null; questionnaire_fields: { label: string } | { label: string }[] | null }[] };

  function answerFor(label: string) {
    const row = (answers ?? []).find((a) => {
      const f = a.questionnaire_fields as unknown as { label: string } | { label: string }[] | null;
      const fLabel = Array.isArray(f) ? f[0]?.label : f?.label;
      return fLabel === label;
    });
    return row?.answer_text?.trim() || "미입력";
  }

  const { data: photos } = consultationIds.length
    ? await supabase.from("consultation_photos").select("id").in("consultation_id", consultationIds)
    : { data: [] as { id: string }[] };
  const photoIds = (photos ?? []).map((p) => p.id as string);

  const { data: aiRows } = photoIds.length
    ? await supabase.from("ai_photo_analyses").select("severity_score, severity_label, concern_areas, needs_review").in("consultation_photo_id", photoIds)
    : { data: [] as { severity_score: number | null; severity_label: string | null; concern_areas: string[]; needs_review: boolean }[] };
  const ai = (aiRows ?? [])[0];

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, status, reservation_slots(start_at)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  const reservationIds = (reservations ?? []).map((r) => r.id as string);

  const { data: payments } = reservationIds.length
    ? await supabase.from("payments").select("type, amount, status, paid_at, created_at, refundable").in("reservation_id", reservationIds)
    : { data: [] as { type: string; amount: number; status: string; paid_at: string | null; created_at: string; refundable: boolean }[] };

  const RES_STATUS: Record<string, { status: "confirmed" | "pending" | "cancelled"; label: string }> = {
    confirmed: { status: "confirmed", label: "확정" },
    pending_payment: { status: "pending", label: "결제대기" },
    changed: { status: "confirmed", label: "일정변경" },
    cancelled: { status: "cancelled", label: "취소" },
    completed: { status: "confirmed", label: "완료" },
    no_show: { status: "cancelled", label: "노쇼" },
  };

  const PAY_STATUS_LABEL: Record<string, string> = {
    pending: "대기",
    paid: "결제완료",
    cancelled: "취소",
    refunded: "환불",
    failed: "실패",
  };

  return {
    id: patient.id as string,
    name: patient.name as string,
    phone: patient.phone as string,
    archivedAt: patient.archived_at as string | null,
    visits: consultations?.length ?? 0,
    reservationsCount: reservations?.length ?? 0,
    concern: answerFor("고민 부위"),
    hope: answerFor("희망 사항"),
    history: answerFor("기존 시술 이력"),
    ai: {
      severity: ai?.severity_score ?? 0,
      label: ai?.severity_label === "mild" ? "경미" : ai?.severity_label === "severe" ? "심함" : ai?.severity_label === "moderate" ? "중등도" : "분석 대기중",
      areas: ai?.concern_areas ?? [],
      needsReview: ai?.needs_review ?? false,
      hasData: !!ai,
    },
    reservationList: (reservations ?? []).map((r) => {
      const slot = r.reservation_slots as unknown as { start_at: string } | { start_at: string }[] | null;
      const startAt = Array.isArray(slot) ? slot[0]?.start_at : slot?.start_at;
      const meta = RES_STATUS[r.status as string] ?? { status: "pending" as const, label: r.status as string };
      return { when: startAt ? formatDateTimeKST(startAt) : "-", status: meta.status, label: meta.label };
    }),
    paymentList: (payments ?? []).map((p) => ({
      type: p.type === "deposit" ? "예약금" : "시술비",
      amount: p.amount,
      status: PAY_STATUS_LABEL[p.status] ?? p.status,
      date: p.paid_at ? formatDateDotKST(p.paid_at) : "-",
    })),
    photos: photoIds.length,
  };
}

// ───────────────────────── 결제·매출 관리 ─────────────────────────

export type PaymentRow = {
  id: string;
  patient: string;
  type: "예약금" | "시술비";
  amount: number;
  method: string;
  date: string;
  status: "pending" | "paid" | "refunded" | "failed" | "cancelled";
  statusLabel: string;
  refundable: boolean;
};

export type PaymentStats = { totalRevenue: number; totalCount: number; refundedSum: number; successRate: number };

export async function getPayments(options?: {
  includeArchived?: boolean;
}): Promise<{ rows: PaymentRow[]; revenue: { d: string; v: number }[]; stats: PaymentStats }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, type, amount, status, pg_provider, paid_at, created_at, refundable, reservations(patients(name), consultations(archived_at))",
    )
    .order("created_at", { ascending: false });

  if (error || !data) return { rows: [], revenue: [], stats: { totalRevenue: 0, totalCount: 0, refundedSum: 0, successRate: 0 } };

  const STATUS_LABEL: Record<string, string> = {
    pending: "대기",
    paid: "결제완료",
    refunded: "환불",
    failed: "실패",
    cancelled: "취소",
  };

  // 매출 추이는 보관 여부와 무관하게 전체 결제 기록 기준으로 계산한다 — 목록에서만 숨기고
  // 통계는 왜곡되지 않도록. 목록은 상담 관리와 같은 기준(예약일 7일 경과)으로 걸러 보여준다.
  const rows: PaymentRow[] = data
    .filter((p) => {
      const resv = p.reservations as unknown as
        | { consultations: { archived_at: string | null } | { archived_at: string | null }[] | null }
        | { consultations: { archived_at: string | null } | { archived_at: string | null }[] | null }[]
        | null;
      const reservation = Array.isArray(resv) ? resv[0] : resv;
      const consultation = reservation?.consultations;
      const consultationObj = Array.isArray(consultation) ? consultation[0] : consultation;
      const archived = !!consultationObj?.archived_at;
      return options?.includeArchived ? archived : !archived;
    })
    .map((p) => {
      const resv = p.reservations as unknown as
        | { patients: { name: string } | { name: string }[] | null }
        | { patients: { name: string } | { name: string }[] | null }[]
        | null;
      const reservation = Array.isArray(resv) ? resv[0] : resv;
      const patient = reservation?.patients;
      const patientObj = Array.isArray(patient) ? patient[0] : patient;
      return {
        id: p.id as string,
        patient: patientObj?.name ?? "-",
        type: p.type === "deposit" ? "예약금" : "시술비",
        amount: p.amount as number,
        method: p.pg_provider ?? "-",
        date: p.paid_at ? formatDateDotKST(p.paid_at) : p.created_at ? formatDateDotKST(p.created_at) : "-",
        status: p.status as PaymentRow["status"],
        statusLabel: STATUS_LABEL[p.status as string] ?? p.status,
        refundable: p.refundable as boolean,
      };
    });

  // 최근 7일(KST) 매출 추이
  const days: { d: string; v: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfTodayKST(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const sum = (data ?? [])
      .filter((p) => p.status === "paid" && p.paid_at && new Date(p.paid_at) >= dayStart && new Date(p.paid_at) < dayEnd)
      .reduce((acc, p) => acc + (p.amount as number), 0);
    const kst = new Date(dayStart.getTime() + 9 * 60 * 60 * 1000);
    days.push({ d: `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`, v: sum });
  }

  // 상단 요약 지표(누적 매출 등)는 보관함 토글과 무관하게 항상 전체 결제 기록 기준으로 낸다 —
  // 목록에서 오래된 건을 숨긴다고 해서 누적 매출이 줄어든 것처럼 보이면 안 되기 때문.
  const paidAll = data.filter((p) => p.status === "paid");
  const stats = {
    totalRevenue: paidAll.reduce((sum, p) => sum + (p.amount as number), 0),
    totalCount: data.length,
    refundedSum: data.filter((p) => p.status === "refunded").reduce((sum, p) => sum + (p.amount as number), 0),
    successRate: data.length > 0 ? Math.round((paidAll.length / data.length) * 1000) / 10 : 0,
  };

  return { rows, revenue: days, stats };
}

export async function refundPayment(paymentId: string) {
  const supabase = createAdminClient();
  await supabase.from("payments").update({ status: "refunded" }).eq("id", paymentId);
  return { ok: true };
}

// ───────────────────────── 설정 · 시술 항목 ─────────────────────────

export async function getProcedureSettings() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("procedures")
    .select("id, name, base_price, deposit_amount, is_active")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function updateProcedureSettings(input: { id: string; name: string; base_price: number; deposit_amount: number; is_active: boolean }) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("procedures")
    .update({
      name: input.name,
      base_price: input.base_price,
      deposit_amount: input.deposit_amount,
      is_active: input.is_active,
    })
    .eq("id", input.id);
  return { ok: !error, error: error?.message };
}

export async function getActiveVideo() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("procedure_videos")
    .select("id, title, duration_sec, is_active, video_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function updateVideoTitle(id: string, title: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("procedure_videos").update({ title }).eq("id", id);
  return { ok: !error, error: error?.message };
}

// ───────────────────────── 통계 · 퍼널 ─────────────────────────

const FUNNEL_STAGE_META: { key: string; label: string }[] = [
  { key: "home", label: "홈 화면 방문" },
  { key: "intro_video", label: "수술 방법 안내 시청" },
  { key: "steps", label: "진행 과정 확인" },
  { key: "simulation", label: "AI 시뮬레이션" },
  { key: "schedule", label: "예약 일정 선택" },
  { key: "reservation_created", label: "예약 신청(결제 화면 진입)" },
  { key: "payment_confirmed", label: "예약금 결제 완료" },
];

export type FunnelStage = { key: string; label: string; count: number; pct: number };

/**
 * 주어진 기간(KST 기준, from~to 둘 다 포함) 동안 방문자가 각 단계까지
 * 얼마나 왔는지 집계한다. home 단계 방문자 수를 100%로 두고 나머지를 비율로 보여준다.
 * home~schedule은 익명 방문 추적(funnel_events), 예약 신청/결제 완료는 실제 reservations
 * 테이블 기준이다.
 */
export async function getFunnelStats(fromDate: string, toDate: string): Promise<FunnelStage[]> {
  const supabase = createAdminClient();

  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const start = kstMidnightUTC(fy, fm - 1, fd);
  const end = kstMidnightUTC(ty, tm - 1, td + 1); // to일 끝까지 포함(다음날 0시 미만)

  const counts: Record<string, number> = {};

  const { data: events } = await supabase
    .from("funnel_events")
    .select("session_id, event")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  const byEvent = new Map<string, Set<string>>();
  for (const row of events ?? []) {
    if (!byEvent.has(row.event)) byEvent.set(row.event, new Set());
    byEvent.get(row.event)!.add(row.session_id);
  }
  for (const key of ["home", "intro_video", "steps", "simulation", "schedule"]) {
    counts[key] = byEvent.get(key)?.size ?? 0;
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("patient_id, status")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  const createdPatients = new Set<string>();
  const confirmedPatients = new Set<string>();
  for (const r of reservations ?? []) {
    createdPatients.add(r.patient_id);
    if (r.status === "confirmed") confirmedPatients.add(r.patient_id);
  }
  counts.reservation_created = createdPatients.size;
  counts.payment_confirmed = confirmedPatients.size;

  const base = counts.home || Math.max(...Object.values(counts), 1);

  return FUNNEL_STAGE_META.map((s) => {
    const count = counts[s.key] ?? 0;
    return { key: s.key, label: s.label, count, pct: base > 0 ? Math.round((count / base) * 1000) / 10 : 0 };
  });
}
