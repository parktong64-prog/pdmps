import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isClosedDay } from "@/lib/booking";

const PHONE_RE = /^01[016789]-\d{3,4}-\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const SLOT_DURATION_MIN = 60;
const DEPOSIT_AMOUNT = 50000;

type Body = {
  name?: string;
  phone?: string;
  email?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const date = body.date ?? "";
  const time = body.time ?? "";

  if (!name) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (!PHONE_RE.test(phone)) return NextResponse.json({ error: "전화번호 형식이 올바르지 않습니다." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    return NextResponse.json({ error: "예약 일시가 올바르지 않습니다." }, { status: 400 });
  }

  const startAt = new Date(`${date}T${time}:00+09:00`);
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "예약 일시가 올바르지 않습니다." }, { status: 400 });
  }
  const endAt = new Date(startAt.getTime() + SLOT_DURATION_MIN * 60 * 1000);

  // date 문자열을 로컬 날짜로 해석해 휴진일(주말·공휴일) 여부를 확인
  const [dy, dm, dd] = date.split("-").map(Number);
  if (isClosedDay(new Date(dy, dm - 1, dd))) {
    return NextResponse.json({ error: "휴진일에는 예약할 수 없습니다." }, { status: 409 });
  }

  const supabase = createAdminClient();

  // 현재는 Face Lift 단일 시술 · 박동만 원장 단일 체계
  const { data: procedure, error: procedureErr } = await supabase
    .from("procedures")
    .select("id, deposit_amount, questionnaire_template_id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (procedureErr || !procedure) {
    return NextResponse.json({ error: "시술 정보를 찾을 수 없습니다." }, { status: 500 });
  }

  const { data: doctor, error: doctorErr } = await supabase
    .from("staff")
    .select("id")
    .eq("role", "doctor")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (doctorErr || !doctor) {
    return NextResponse.json({ error: "담당의 정보를 찾을 수 없습니다." }, { status: 500 });
  }

  // 관리자가 미리 열어둔(또는 아직 아무 기록이 없는=기본 오픈) 슬롯인지 먼저 확인한다.
  // 환자/상담 레코드를 만들기 전에 걸러야 거부되는 요청마다 고아 레코드가 남지 않는다.
  const { data: existingSlot } = await supabase
    .from("reservation_slots")
    .select("id, status")
    .eq("staff_id", doctor.id)
    .eq("start_at", startAt.toISOString())
    .maybeSingle();

  if (existingSlot && (existingSlot.status === "booked" || existingSlot.status === "held")) {
    return NextResponse.json({ error: "이미 예약이 마감된 시간입니다. 다른 시간을 선택해주세요." }, { status: 409 });
  }
  if (existingSlot && existingSlot.status === "blocked") {
    return NextResponse.json({ error: "예약할 수 없는 시간입니다. 다른 시간을 선택해주세요." }, { status: 409 });
  }

  // 환자 upsert (전화번호 unique)
  const { data: patient, error: patientErr } = await supabase
    .from("patients")
    .upsert({ name, phone, email }, { onConflict: "phone" })
    .select("id")
    .single();
  if (patientErr || !patient) {
    return NextResponse.json({ error: "환자 정보 저장에 실패했습니다." }, { status: 500 });
  }

  const { data: consultation, error: consultationErr } = await supabase
    .from("consultations")
    .insert({
      patient_id: patient.id,
      procedure_id: procedure.id,
      status: "reserved",
      source: "web",
    })
    .select("id")
    .single();
  if (consultationErr || !consultation) {
    return NextResponse.json({ error: "상담 정보 저장에 실패했습니다." }, { status: 500 });
  }

  // 슬롯 확보 시도. 위에서 통과했더라도 그 사이 다른 요청이 먼저 선점했을 수 있으므로
  // 최종 확정은 update/insert의 조건절(WHERE status='open' / unique 제약)로 한 번 더 검증한다.
  let slot: { id: string };
  if (existingSlot) {
    const { data: updated, error: updateErr } = await supabase
      .from("reservation_slots")
      .update({ status: "booked" })
      .eq("id", existingSlot.id)
      .eq("status", "open") // 그 사이 다른 요청이 선점했다면 매칭 실패 -> updated는 null
      .select("id")
      .maybeSingle();
    if (updateErr || !updated) {
      await supabase.from("consultations").delete().eq("id", consultation.id);
      return NextResponse.json({ error: "이미 예약이 마감된 시간입니다. 다른 시간을 선택해주세요." }, { status: 409 });
    }
    slot = updated;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("reservation_slots")
      .insert({
        procedure_id: procedure.id,
        staff_id: doctor.id,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: "booked",
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      await supabase.from("consultations").delete().eq("id", consultation.id);
      // 동일 담당의·시간대 슬롯 중복 (unique 제약 위반 등 — 동시 요청 경합)
      if (insertErr?.code === "23505") {
        return NextResponse.json({ error: "이미 예약이 마감된 시간입니다. 다른 시간을 선택해주세요." }, { status: 409 });
      }
      return NextResponse.json({ error: "예약 시간 등록에 실패했습니다." }, { status: 500 });
    }
    slot = inserted;
  }

  const { data: reservation, error: reservationErr } = await supabase
    .from("reservations")
    .insert({
      slot_id: slot.id,
      consultation_id: consultation.id,
      patient_id: patient.id,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (reservationErr || !reservation) {
    return NextResponse.json({ error: "예약 확정에 실패했습니다." }, { status: 500 });
  }

  await supabase.from("payments").insert({
    reservation_id: reservation.id,
    type: "deposit",
    amount: procedure.deposit_amount ?? DEPOSIT_AMOUNT,
    pg_provider: "mock",
    pg_transaction_id: `MOCK-${reservation.id.slice(0, 8)}`,
    status: "paid",
    refundable: false,
    paid_at: new Date().toISOString(),
  });

  await supabase.from("notifications").insert({
    reservation_id: reservation.id,
    consultation_id: consultation.id,
    recipient_patient_id: patient.id,
    channel: "alimtalk",
    template_key: "reservation_confirmed",
    status: "queued",
  });

  return NextResponse.json({ ok: true, reservationId: reservation.id });
}
