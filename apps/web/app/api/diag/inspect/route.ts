import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 임시 진단용. 확인 후 제거.
export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reservation_slots")
    .select("id, start_at, end_at, status")
    .gte("start_at", "2026-09-17T00:00:00Z")
    .lt("start_at", "2026-09-18T00:00:00Z");

  // findSlotDate와 동일한 방식으로 로컬 타임존 기준 Date를 만들어봤을 때의 결과 비교
  const localBuilt = new Date(2026, 8, 17, 14, 30, 0);

  return NextResponse.json({
    TZ: process.env.TZ ?? "(unset)",
    serverNow: new Date().toString(),
    localBuiltFrom_y_m_d_h_m: localBuilt.toISOString(),
    slotsOnSept17: data,
  });
}
