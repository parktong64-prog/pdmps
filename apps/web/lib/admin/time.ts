// 서버는 UTC로 도는 경우가 많으므로, 통계/기간 계산은 항상 KST(UTC+9) 기준으로 맞춘다.
// 한국은 서머타임이 없어 오프셋이 항상 +9시간으로 고정이다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 주어진 시각(기본: 지금)을 KST 벽시계 기준 연/월/일/요일로 분해한다. */
export function kstParts(d: Date = new Date()) {
  const shifted = new Date(d.getTime() + KST_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(), // 0=일 ... 6=토
  };
}

/** KST 기준 y-m-day 00:00을 나타내는 실제 UTC 시각(Date)을 반환한다. */
export function kstMidnightUTC(y: number, m: number, day: number) {
  return new Date(Date.UTC(y, m, day) - KST_OFFSET_MS);
}

export function startOfTodayKST(now = new Date()) {
  const { y, m, day } = kstParts(now);
  return kstMidnightUTC(y, m, day);
}

export function startOfTomorrowKST(now = new Date()) {
  const { y, m, day } = kstParts(now);
  return kstMidnightUTC(y, m, day + 1);
}

/** 월요일 시작 기준 이번 주의 시작/끝(끝은 다음 주 월요일, exclusive) */
export function currentWeekRangeKST(now = new Date()) {
  const { y, m, day, weekday } = kstParts(now);
  const daysSinceMonday = (weekday + 6) % 7;
  const start = kstMidnightUTC(y, m, day - daysSinceMonday);
  const end = kstMidnightUTC(y, m, day - daysSinceMonday + 7);
  return { start, end };
}

export function currentMonthRangeKST(now = new Date()) {
  const { y, m } = kstParts(now);
  const start = kstMidnightUTC(y, m, 1);
  const end = kstMidnightUTC(y, m + 1, 1);
  return { start, end };
}

export function formatDateDotKST(iso: string) {
  const { m, day } = kstParts(new Date(iso));
  return `${String(m + 1).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

export function formatDateTimeKST(iso: string) {
  const d = new Date(iso);
  const { m, day, weekday } = kstParts(d);
  const hh = new Date(d.getTime() + KST_OFFSET_MS).getUTCHours();
  const mm = new Date(d.getTime() + KST_OFFSET_MS).getUTCMinutes();
  const w = ["일", "월", "화", "수", "목", "금", "토"][weekday];
  return `${String(m + 1).padStart(2, "0")}.${String(day).padStart(2, "0")}(${w}) ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
