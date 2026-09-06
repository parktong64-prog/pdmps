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
} from "@/lib/admin/time";
import { dateKey } from "@/lib/booking";

const SLOT_DURATION_MIN = 60;
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
      supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
      supabase
        .from("consultations")
        .select("id, status, source, created_at, patients(name)")
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
      meta: `${r.source === "app" ? "앱" : "웹"} · ${formatDateTimeKST(r.created_at as string)}`,
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
  channel: "웹" | "앱";
  status: StatusKey;
  statusLabel: string;
  date: string;
  flagged: boolean;
};

export async function getConsultations(): Promise<ConsultationRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("consultations")
    .select("id, status, source, created_at, patients(name)")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((r) => {
    const meta = consultationStatusMeta(r.status);
    const patient = r.patients as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(patient) ? patient[0]?.name : patient?.name;
    return {
      id: r.id as string,
      name: name ?? "-",
      channel: r.source === "app" ? "앱" : "웹",
      status: meta.key,
      statusLabel: meta.label,
      date: formatDateDotKST(r.created_at as string),
      flagged: r.status === "needs_review",
    };
  });
}

// ───────────────────────── 예약 관리 (주간 그리드) ─────────────────────────

export type SlotCell = {
  status: "open" | "booked" | "blocked" | "pending";
  reservationId?: string;
  patientName?: string;
  patientPhone?: string;
};

/** weekStartISO(그 주 일요일 00:00 KST 기준 로컬 날짜)부터 7일치 슬롯 맵을 반환. key: `${dateKey}_${time}` */
export async function getWeekSlots(y: number, m: number, d: number): Promise<Record<string, SlotCell>> {
  const supabase = createAdminClient();
  const start = new Date(y, m, d, 0, 0, 0);
  const end = new Date(y, m, d + 7, 0, 0, 0);

  const { data, error } = await supabase
    .from("reservation_slots")
    .select("id, start_at, status, reservations(id, status, cancel_reason, patients(name, phone))")
    .eq("staff_id", DOCTOR_ID)
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString());

  if (error || !data) return {};

  const map: Record<string, SlotCell> = {};
  for (const row of data) {
    const localDate = new Date(row.start_at as string);
    const key = `${dateKey(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())}_${localDate
      .toTimeString()
      .slice(0, 5)}`;
    const resv = row.reservations as unknown as
      | { id: string; status: string; patients: { name: string; phone: string } | { name: string; phone: string }[] | null }
      | { id: string; status: string; patients: { name: string; phone: string } | { name: string; phone: string }[] | null }[]
      | null;
    const reservation = Array.isArray(resv) ? resv[0] : resv;
    const patient = reservation?.patients;
    const patientObj = Array.isArray(patient) ? patient[0] : patient;

    if (row.status === "booked" && reservation && reservation.status !== "cancelled") {
      map[key] = {
        status: "booked",
        reservationId: reservation.id,
        patientName: patientObj?.name,
        patientPhone: patientObj?.phone,
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
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm, 0);
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

export async function getPayments(): Promise<{ rows: PaymentRow[]; revenue: { d: string; v: number }[] }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, type, amount, status, pg_provider, paid_at, created_at, refundable, reservations(patients(name))")
    .order("created_at", { ascending: false });

  if (error || !data) return { rows: [], revenue: [] };

  const STATUS_LABEL: Record<string, string> = {
    pending: "대기",
    paid: "결제완료",
    refunded: "환불",
    failed: "실패",
    cancelled: "취소",
  };

  const rows: PaymentRow[] = data.map((p) => {
    const resv = p.reservations as unknown as { patients: { name: string } | { name: string }[] | null } | { patients: { name: string } | { name: string }[] | null }[] | null;
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

  return { rows, revenue: days };
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
