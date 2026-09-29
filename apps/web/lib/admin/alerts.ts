"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAlert = { id: string; message: string; createdAt: string };

/** 아직 확인하지 않은 관리자 알림 목록 (예: 새 예약 확정). 오래된 순으로 반환. */
export async function getUnacknowledgedAlerts(): Promise<AdminAlert[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_alerts")
    .select("id, message, created_at")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({ id: r.id as string, message: r.message as string, createdAt: r.created_at as string }));
}

/** 관리자가 알림을 확인 처리한다 — 이후 이 알림으로는 더 이상 알람이 울리지 않는다. */
export async function acknowledgeAlert(id: string) {
  const supabase = createAdminClient();
  await supabase.from("admin_alerts").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}
