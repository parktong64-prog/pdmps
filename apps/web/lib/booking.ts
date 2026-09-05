// 예약 캘린더 관련 공용 상수/헬퍼.
// 환자용(/consult/schedule)과 관리자용(/admin/reservations, /admin/schedule)이
// 동일한 휴진 규칙을 참조하도록 여기에 모아둔다.
// 실제 연동 시 이 파일의 로직은 reservation_slots 테이블 조회로 교체된다.

export const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
export const TIMES = ["10:00", "11:00", "13:00", "14:30", "16:00", "17:30"];

// 정기 휴진 외에 병원이 별도로 막아둔 날짜 (공휴일/원장 학회 등)
export const BLOCKED: Record<string, string> = {
  "2026-09-24": "추석연휴",
  "2026-09-25": "추석연휴",
  "2026-09-26": "추석연휴",
  "2026-10-09": "한글날",
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

export function isClosedDay(date: Date) {
  const weekday = date.getDay();
  return weekday === 0 || weekday === 6 || !!BLOCKED[dateKey(date.getFullYear(), date.getMonth(), date.getDate())];
}
