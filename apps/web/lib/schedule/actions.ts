"use server";

// 환자용 예약 캘린더(/consult/schedule)와 관리자용 일정 설정(/admin/schedule)이
// 공유하는 슬롯 조회/변경 로직. reservation_slots 테이블이 유일한 진실 소스이며,
// 행이 없으면 "기본 오픈"으로 간주한다 (평일 진료가 기본값이라는 병원 운영 방식과 일치).

import { createAdminClient } from "@/lib/supabase/admin";
import { TIMES, isClosedDay, dateKey, kstMidnightInstant, kstDateTimeKey } from "@/lib/booking";
import { blockSlot, reopenSlot } from "@/lib/admin/actions";
import { expireStaleHeldReservations } from "@/lib/payments/toss";

const DOCTOR_ID = "00000000-0000-0000-0000-000000000001";

export type TimeState = "blocked" | "booked" | "pending";

/** 지정한 년/월(0-indexed month)의 슬롯 상태 맵. key: `${YYYY-MM-DD}_${HH:mm}`.
 *  "open"은 별도 표시하지 않음 — 맵에 없으면 오픈이라는 뜻. */
export async function getMonthSlotStates(y: number, m: number): Promise<Record<string, TimeState>> {
  // 환자/관리자 둘 다 이 함수를 거쳐 달력을 보므로, 방치된 결제 대기 홀드를
  // 여기서 정리해두면 실제로 비어있는 시간이 "마감"으로 잘못 보이는 일이 없어진다.
  await expireStaleHeldReservations();

  const supabase = createAdminClient();
  // y/m은 브라우저(KST)에서 뽑아낸 달력 날짜이므로, 서버(UTC)에서 그대로
  // new Date(y, m, 1)로 만들면 안 되고 KST 자정 기준 절대 시각으로 변환해야 한다.
  const start = kstMidnightInstant(y, m, 1);
  const end = kstMidnightInstant(y, m + 1, 1);

  const { data, error } = await supabase
    .from("reservation_slots")
    .select("start_at, status")
    .eq("staff_id", DOCTOR_ID)
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString());

  if (error || !data) return {};

  const map: Record<string, TimeState> = {};
  for (const row of data) {
    if (row.status !== "booked" && row.status !== "blocked" && row.status !== "held") continue;
    const { dateKey: dk, time } = kstDateTimeKey(row.start_at as string);
    map[`${dk}_${time}`] = (row.status === "held" ? "pending" : row.status) as TimeState;
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
