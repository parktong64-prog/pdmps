import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isClosedDay } from "@/lib/booking";
import { sendReservationNotificationEmail } from "@/lib/notifications/email";
import { sendReservationConfirmedAlimtalk } from "@/lib/notifications/alimtalk";

const SLOT_DURATION_MIN = 90;
const PAYMENT_HOLD_MIN = 10;
const DEPOSIT_AMOUNT = 50000;

export type PendingReservationInput = {
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
};

export type PendingReservationResult =
  | { ok: true; orderId: string; amount: number; orderName: string; customerName: string }
  | { ok: false; error: string; status: number };

/**
 * 결제 전 단계: 슬롯을 선점하고 reservations를 'pending_payment' 상태로 만든다.
 * 실제 결제 승인(confirmTossPayment)이 성공해야 'confirmed'로 바뀐다.
 * 결제 실패/이탈 시 cancelPendingReservation으로 되돌린다.
 */
export async function createPendingReservation(input: PendingReservationInput): Promise<PendingReservationResult> {
  const { name, phone, date, time } = input;

  const startAt = new Date(`${date}T${time}:00+09:00`);
  if (Number.isNaN(startAt.getTime())) {
    return { ok: false, error: "예약 일시가 올바르지 않습니다.", status: 400 };
  }
  const endAt = new Date(startAt.getTime() + SLOT_DURATION_MIN * 60 * 1000);

  const [dy, dm, dd] = date.split("-").map(Number);
  if (isClosedDay(new Date(dy, dm - 1, dd))) {
    return { ok: false, error: "휴진일에는 예약할 수 없습니다.", status: 409 };
  }

  // 방치된 결제 대기 예약을 먼저 정리해서, 이미 만료된 홀드 때문에
  // "마감된 시간"으로 잘못 표시되는 일이 없도록 한다.
  await expireStaleHeldReservations();

  const supabase = createAdminClient();

  const { data: procedure, error: procedureErr } = await supabase
    .from("procedures")
    .select("id, deposit_amount")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (procedureErr || !procedure) {
    return { ok: false, error: "시술 정보를 찾을 수 없습니다.", status: 500 };
  }

  const { data: doctor, error: doctorErr } = await supabase
    .from("staff")
    .select("id")
    .eq("role", "doctor")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (doctorErr || !doctor) {
    return { ok: false, error: "담당의 정보를 찾을 수 없습니다.", status: 500 };
  }

  const { data: existingSlot } = await supabase
    .from("reservation_slots")
    .select("id, status")
    .eq("staff_id", doctor.id)
    .eq("start_at", startAt.toISOString())
    .maybeSingle();

  if (existingSlot && (existingSlot.status === "booked" || existingSlot.status === "held")) {
    return { ok: false, error: "이미 예약이 마감된 시간입니다. 다른 시간을 선택해주세요.", status: 409 };
  }
  if (existingSlot && existingSlot.status === "blocked") {
    return { ok: false, error: "예약할 수 없는 시간입니다. 다른 시간을 선택해주세요.", status: 409 };
  }

  // email은 더 이상 입력받지 않는다 — upsert 대상에서 빼서 기존 환자의 이메일 기록은 그대로 둔다.
  const { data: patient, error: patientErr } = await supabase
    .from("patients")
    .upsert({ name, phone }, { onConflict: "phone" })
    .select("id")
    .single();
  if (patientErr || !patient) {
    return { ok: false, error: "환자 정보 저장에 실패했습니다.", status: 500 };
  }

  const { data: consultation, error: consultationErr } = await supabase
    .from("consultations")
    .insert({ patient_id: patient.id, procedure_id: procedure.id, status: "reserved", source: "web" })
    .select("id")
    .single();
  if (consultationErr || !consultation) {
    return { ok: false, error: "상담 정보 저장에 실패했습니다.", status: 500 };
  }

  let slotId: string;
  if (existingSlot) {
    const { data: updated, error: updateErr } = await supabase
      .from("reservation_slots")
      .update({ status: "held" })
      .eq("id", existingSlot.id)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (updateErr || !updated) {
      await supabase.from("consultations").delete().eq("id", consultation.id);
      return { ok: false, error: "이미 예약이 마감된 시간입니다. 다른 시간을 선택해주세요.", status: 409 };
    }
    slotId = updated.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("reservation_slots")
      .insert({
        procedure_id: procedure.id,
        staff_id: doctor.id,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: "held",
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      await supabase.from("consultations").delete().eq("id", consultation.id);
      if (insertErr?.code === "23505") {
        return { ok: false, error: "이미 예약이 마감된 시간입니다. 다른 시간을 선택해주세요.", status: 409 };
      }
      return { ok: false, error: "예약 시간 등록에 실패했습니다.", status: 500 };
    }
    slotId = inserted.id;
  }

  const paymentDeadline = new Date(Date.now() + PAYMENT_HOLD_MIN * 60 * 1000);
  const { data: reservation, error: reservationErr } = await supabase
    .from("reservations")
    .insert({
      slot_id: slotId,
      consultation_id: consultation.id,
      patient_id: patient.id,
      status: "pending_payment",
      payment_deadline: paymentDeadline.toISOString(),
    })
    .select("id")
    .single();
  if (reservationErr || !reservation) {
    await supabase.from("reservation_slots").update({ status: "open" }).eq("id", slotId);
    await supabase.from("consultations").delete().eq("id", consultation.id);
    return { ok: false, error: "예약 생성에 실패했습니다.", status: 500 };
  }

  return {
    ok: true,
    orderId: reservation.id,
    amount: procedure.deposit_amount ?? DEPOSIT_AMOUNT,
    orderName: "Face Lift 상담 예약금",
    customerName: name,
  };
}

/** 결제 실패/이탈 시 pending_payment 예약을 되돌린다 (슬롯 재오픈, 상담/예약 삭제). */
export async function cancelPendingReservation(orderId: string) {
  const supabase = createAdminClient();
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, slot_id, consultation_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!reservation || reservation.status !== "pending_payment") return { ok: true };

  await supabase.from("reservations").delete().eq("id", reservation.id);
  await supabase.from("reservation_slots").update({ status: "open" }).eq("id", reservation.slot_id);
  await supabase.from("consultations").delete().eq("id", reservation.consultation_id);
  return { ok: true };
}

/**
 * 결제 없이 방치된 pending_payment 예약(payment_deadline 경과)을 일괄 정리한다.
 * Vercel Hobby 플랜에서는 짧은 주기의 Cron Job을 쓸 수 없어서, 별도 배치 작업 대신
 * 예약 슬롯을 조회하는 시점(관리자 화면 로드, 새 예약 시도 등)마다 opportunistic하게
 * 호출해 만료된 홀드를 그때그때 풀어준다.
 */
export async function expireStaleHeldReservations(): Promise<{ expired: number }> {
  const supabase = createAdminClient();
  const { data: stale } = await supabase
    .from("reservations")
    .select("id, slot_id, consultation_id")
    .eq("status", "pending_payment")
    .lt("payment_deadline", new Date().toISOString());

  if (!stale || stale.length === 0) return { expired: 0 };

  for (const r of stale) {
    await supabase.from("reservations").delete().eq("id", r.id);
    await supabase.from("reservation_slots").update({ status: "open" }).eq("id", r.slot_id);
    await supabase.from("consultations").delete().eq("id", r.consultation_id);
  }
  return { expired: stale.length };
}

export type ConfirmResult =
  | {
      ok: true;
      reservation: { name: string; phone: string; when: string };
    }
  | { ok: false; error: string };

/** Toss 결제 승인 API를 호출하고, 성공하면 예약을 확정 상태로 전환한다. */
export async function confirmTossPayment(params: { paymentKey: string; orderId: string; amount: number }): Promise<ConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "결제 설정이 올바르지 않습니다." };

  const supabase = createAdminClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, slot_id, consultation_id, patient_id, status, reservation_slots(start_at), patients(name, phone)")
    .eq("id", params.orderId)
    .maybeSingle();

  if (!reservation) return { ok: false, error: "예약 정보를 찾을 수 없습니다." };
  if (reservation.status === "confirmed") {
    // 이미 확정 처리된 요청(중복 콜백 등) — 성공으로 응답
  } else if (reservation.status !== "pending_payment") {
    return { ok: false, error: "이미 처리되었거나 만료된 예약입니다." };
  } else {
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.message || "결제 승인에 실패했습니다." };
    }
    const payment = await res.json();

    const { error: updateErr } = await supabase
      .from("reservations")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", reservation.id);
    if (updateErr) return { ok: false, error: "예약 확정 처리에 실패했습니다." };

    await supabase.from("reservation_slots").update({ status: "booked" }).eq("id", reservation.slot_id);

    await supabase.from("payments").insert({
      reservation_id: reservation.id,
      type: "deposit",
      amount: params.amount,
      pg_provider: "toss",
      pg_transaction_id: payment.paymentKey ?? params.paymentKey,
      status: "paid",
      refundable: false,
      paid_at: new Date().toISOString(),
    });

  }

  const slot = reservation.reservation_slots as unknown as { start_at: string } | { start_at: string }[] | null;
  const startAt = Array.isArray(slot) ? slot[0]?.start_at : slot?.start_at;
  const patient = reservation.patients as unknown as { name: string; phone: string } | { name: string; phone: string }[] | null;
  const patientObj = Array.isArray(patient) ? patient[0] : patient;

  const whenLabel = startAt ? formatWhenKST(startAt) : "-";

  // 관리자 알림 이메일 · 환자 알림톡 — 실패해도 예약 확정 자체에는 영향 없도록 별도로 처리
  if (startAt && patientObj?.name) {
    // Vercel 서버리스 환경에서는 응답을 반환한 뒤 실행 컨텍스트가 바로 정리될 수 있어
    // await 없이 fire-and-forget으로 보내면 fetch가 끝나기 전에 잘릴 수 있다. 반드시 기다린다.
    const { dateLabel, timeLabel } = formatDateTimeKST(startAt);
    await sendReservationNotificationEmail({
      name: patientObj.name,
      phone: patientObj.phone ?? "-",
      date: dateLabel,
      time: timeLabel,
    });

    if (patientObj.phone) {
      const alimtalkResult = await sendReservationConfirmedAlimtalk({
        phone: patientObj.phone,
        date: dateLabel,
        time: timeLabel,
      });
      await supabase.from("notifications").insert({
        reservation_id: reservation.id,
        consultation_id: reservation.consultation_id,
        recipient_patient_id: reservation.patient_id,
        channel: "alimtalk",
        template_key: "reservation_confirmed",
        status: alimtalkResult.ok ? "sent" : "failed",
        sent_at: alimtalkResult.ok ? new Date().toISOString() : null,
      });
      if (!alimtalkResult.ok) {
        console.error("알림톡 발송 실패:", alimtalkResult.error);
      }
    }
  }

  return {
    ok: true,
    reservation: {
      name: patientObj?.name ?? "-",
      phone: patientObj?.phone ?? "-",
      when: whenLabel,
    },
  };
}

function formatWhenKST(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${weekday}) ${hh}:${mm}`;
}

/** 알림 이메일용으로 날짜와 시간을 따로 뽑는다. */
function formatDateTimeKST(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return {
    dateLabel: `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${weekday})`,
    timeLabel: `${hh}:${mm}`,
  };
}
