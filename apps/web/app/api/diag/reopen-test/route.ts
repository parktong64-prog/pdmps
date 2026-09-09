import { NextResponse } from "next/server";
import { reopenSlot } from "@/lib/admin/actions";

// 임시: 타임존 버그로 잘못 생성된 차단 슬롯(9/18 01:00 KST) 정리용. 확인 후 제거.
export async function GET() {
  const result = await reopenSlot("2026-09-18", "01:00");
  return NextResponse.json(result);
}
