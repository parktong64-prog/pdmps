"use server";

// 환자용 예약 캘린더(/consult/schedule)와 관리자용 일정 설정(/admin/schedule)이
// 공유하는 슬롯 조회/변경 로직. reservation_slots 테이블이 유일한 진실 소스이며,
// 행이 없으면 "기본 오픈"으로 간주한다 (평일 진료가 기본값이라는 병원 운영 방식과 일치).

import { createAdminClient } from "@/lib/supabase/admin";
import { TIMES, isClosedDay, dateKey } from "@/lib/booking";
import { blockSlot, reopenSlot } from "@/lib/admin/actions";

const DOCTOR_ID = "00000000-0000-0000-0000-000000000001";

export type TimeState = "blocked" | "booked";

/** 지정한 년/월(0-indexed month)의 슬롯 상태 맵. key: `${YYYY-MM-DD}_${HH:mm}`.
 *  "open"은 별도 표시하지 않음 — 맵에 없으면 오픈이라는 뜻. */
export async function getMonthSlotStates(y: number, m: number): Promise<Record<string, TimeState>> {
  const supabase = createAdminClient();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);

  const { data, error } = await supabase
    .from("reservation_slots")
    .select("start_at, status")
    .eq("staff_id", DOCTOR_ID)
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString());

  if (error || !data) return {};

  const map: Record<string, TimeState> = {};
  for (const row of data) {
    if (row.status !== "booked" && row.status !== "blocked") continue;
    const d = new Date(row.start_at as string);
    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${d.toTimeString().slice(0, 5)}`;
    map[key] = row.status as TimeState;
  }
  return map;
}

/** 하루 전체를 열거나(true) 닫는다(false). 이미 예약된 시간은 건드리지 않는다. */
export async function setDayOpen(dateStr: string, open: boolean) {
  for (const time of TIMES) {
    if (open) await reopenSlot(dateStr, time);
    else await blockSlot(dateStr, time);
  }
  return { ok: true };
}

/** 특정 시간 하나를 막거나(true) 다시 연다(false). */
export async function setTimeBlocked(dateStr: string, time: string, blocked: boolean) {
  return blocked ? blockSlot(dateStr, time) : reopenSlot(dateStr, time);
}

/** 하루의 오픈 시간 목록을 openTimes에 맞춘다 (이미 예약된 시간은 그대로 둠). */
export async function applyDayPattern(dateStr: string, openTimes: string[]) {
  const openSet = new Set(openTimes);
  for (const time of TIMES) {
    if (openSet.has(time)) await reopenSlot(dateStr, time);
    else await blockSlot(dateStr, time);
  }
  return { ok: true };
}

/** 지정한 월에서 같은 요일(0=일 ... 6=토)에 해당하는 미래 날짜 전체에 동일한 오픈 시간 패턴을 적용. */
export async function applyWeekdayPattern(y: number, m: number, weekday: number, openTimes: string[]) {
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let applied = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    if (date.getDay() !== weekday) continue;
    if (date < today) continue;
    if (isClosedDay(date)) continue;
    await applyDayPattern(dateKey(y, m, d), openTimes);
    applied++;
  }
  return { ok: true, applied };
}
