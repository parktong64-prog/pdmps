"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const DAYS_PAST_DUE = 7;

/**
 * 오래된 상담을 상담 관리 목록에서 자동으로 숨긴다 (완전 삭제가 아니라 consultations.archived_at만
 * 채운다 — 결제·예약 기록은 그대로 보존되고, 관리자 화면의 "보관함 보기"에서 언제든 복원할 수 있다.
 * 개인정보처리방침에 명시한 계약·결제 기록 보관 기간과 어긋나지 않도록 데이터 자체는 지우지 않는다).
 *
 * - 예약이 있는 상담: 예약일이 7일 넘게 지난 경우
 * - 예약이 없는 상담: 신청일(created_at)이 7일 넘게 지난 경우
 */
export async function archiveOldConsultations(): Promise<{ archived: number }> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - DAYS_PAST_DUE * 24 * 60 * 60 * 1000).toISOString();

  const { data: dueReservations } = await supabase
    .from("reservations")
    .select("consultation_id, reservation_slots!inner(start_at)")
    .lt("reservation_slots.start_at", cutoff);

  const { data: oldConsultations } = await supabase
    .from("consultations")
    .select("id, reservations(id)")
    .is("archived_at", null)
    .lt("created_at", cutoff);

  const withoutReservation = (oldConsultations ?? [])
    .filter((c) => ((c.reservations as unknown as unknown[] | null) ?? []).length === 0)
    .map((c) => c.id as string);

  const ids = [...new Set([...(dueReservations ?? []).map((r) => r.consultation_id as string), ...withoutReservation])];
  if (ids.length === 0) return { archived: 0 };

  const { data: updated, error } = await supabase
    .from("consultations")
    .update({ archived_at: new Date().toISOString() })
    .in("id", ids)
    .is("archived_at", null)
    .select("id");

  if (error || !updated) return { archived: 0 };
  return { archived: updated.length };
}
