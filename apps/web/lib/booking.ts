// 예약 캘린더 관련 공용 상수/헬퍼.
// 환자용(/consult/schedule)과 관리자용(/admin/reservations, /admin/schedule)이
// 동일한 휴진 규칙을 참조하도록 여기에 모아둔다.
// 실제 연동 시 이 파일의 로직은 reservation_slots 테이블 조회로 교체된다.

import { publicHolidayName } from "./holidays";

export const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
// 상담 소요시간 1시간 30분 간격으로 배치. 오후 진료만 운영한다 (오전 10:00, 11:30 폐지).
export const TIMES = ["13:00", "14:30", "16:00"];

// 정기 휴진 외에 병원이 별도로 막아둔 날짜 (공휴일/원장 학회 등)
export const BLOCKED: Record<string, string> = {
  "2026-09-24": "추석연휴",
  "2026-09-25": "추석연휴",
  "2026-09-26": "추석연휴",
  "2026-10-05": "개천절 대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  "2027-01-01": "신정",
  "2027-02-08": "설날연휴",
  "2027-02-09": "설날 대체공휴일",
  "2027-03-01": "삼일절",
};

export function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/** 결정론적 가짜 예약 여부 (실제로는 reservations 테이블 조회) */
export function isNaturallyBooked(key: string, time: string) {
  return hash(`${key}_${time}`) % 100 < 30;
}

/** 달력에서 붉게 표시할 날(토·일, 법정 공휴일, 병원 지정 휴진일)인지 여부. 실제 예약 마감(isClosedDay)과는 별개다. */
export function isRedDay(date: Date) {
  const w = date.getDay();
  return w === 0 || w === 6 || !!redDayName(date);
}

/** 공휴일 또는 병원 지정 휴진일의 이름 (없으면 null). */
export function redDayName(date: Date): string | null {
  return BLOCKED[dateKey(date.getFullYear(), date.getMonth(), date.getDate())] ?? publicHolidayName(date);
}

export function isClosedDay(date: Date) {
  const weekday = date.getDay();
  return weekday === 0 || weekday === 6 || !!BLOCKED[dateKey(date.getFullYear(), date.getMonth(), date.getDate())];
}

// ───────────────────────── KST ↔ 서버(UTC) 시각 변환 ─────────────────────────
// Vercel 서버는 UTC로 돈다. "YYYY-MM-DD"/"HH:mm" 같은 KST 달력 표기를
// new Date(y, m, d, hh, mm)처럼 로컬 타임존에 의존해 다루면, 서버에서는
// 그 값이 KST가 아니라 UTC로 해석되어 실제 저장된 시각과 9시간 어긋난다.
// 절대 시각을 다룰 때는 반드시 아래 헬퍼를 통해 KST 오프셋(+09:00)을 명시한다.

/** "YYYY-MM-DD" 날짜와 "HH:mm" 시간을 KST 기준 절대 시각으로 변환한다. */
export function kstInstant(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00+09:00`);
}

/** KST 기준 y년 m월(0-indexed)/day일 00:00을 나타내는 절대 시각(UTC 인스턴트)을 반환한다.
 *  day는 0 이하/월말 초과 등 오버플로 값이 들어와도 Date.UTC가 알아서 넘겨준다. */
export function kstMidnightInstant(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day) - 9 * 60 * 60 * 1000);
}

/** 저장된 UTC ISO 시각 문자열을 KST 기준 날짜 키("YYYY-MM-DD")와 "HH:mm"으로 분해한다. */
export function kstDateTimeKey(iso: string): { dateKey: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const key = dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  const time = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
  return { dateKey: key, time };
}
