import { NextResponse } from "next/server";
import { cancelReservationSlot } from "@/lib/admin/actions";

// 임시: 결제 서비스 점검 중 만든 테스트 예약(9/17 14:30) 정리용. 확인 후 제거할 것.
export async function GET() {
  const result = await cancelReservationSlot("2026-09-17", "14:30");
  return NextResponse.json(result);
}
