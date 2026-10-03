// 한국 법정 공휴일을 날짜만 주면 알아서 계산한다 (매년 목록을 손으로 넣지 않도록).
// - 양력 고정 공휴일 + 음력 공휴일(설날·추석 연휴, 부처님오신날)은 브라우저/서버에 내장된
//   음력 달력(Intl chinese calendar)으로 구한다.
// - 대체공휴일: 설날·추석 연휴가 일요일과 겹치면, 어린이날·삼일절·광복절·개천절·한글날·
//   부처님오신날·성탄절이 토·일요일과 겹치면 다음 첫 평일을 쉬는 날로 본다.
// - 임시공휴일·선거일처럼 미리 정해지지 않는 날은 아래 EXTRA에 직접 추가한다.

const EXTRA: Record<string, string> = {
  "2026-06-03": "지방선거일",
};

const SOLAR: Record<string, string> = {
  "01-01": "신정",
  "03-01": "삼일절",
  "05-05": "어린이날",
  "06-06": "현충일",
  "08-15": "광복절",
  "10-03": "개천절",
  "10-09": "한글날",
  "12-25": "성탄절",
};

const SUBSTITUTABLE = new Set(["삼일절", "어린이날", "광복절", "개천절", "한글날", "부처님오신날", "성탄절"]);

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const lunarFormat = new Intl.DateTimeFormat("en-u-ca-chinese", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" });

function lunarOf(y: number, m: number, d: number): { month: number; day: number; leap: boolean } {
  const parts = lunarFormat.formatToParts(new Date(`${key(y, m, d)}T12:00:00+09:00`));
  const monthRaw = parts.find((p) => p.type === "month")?.value ?? "";
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { month: parseInt(monthRaw, 10), day, leap: /bis/i.test(monthRaw) };
}

const cache = new Map<number, Map<string, string>>();

function dayOfWeek(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d)).getUTCDay();
}

function addDays(y: number, m: number, d: number, n: number): [number, number, number] {
  const t = new Date(Date.UTC(y, m, d + n));
  return [t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()];
}

function holidaysOf(year: number): Map<string, string> {
  const hit = cache.get(year);
  if (hit) return hit;

  const base = new Map<string, string>();
  const groups: string[][] = []; // 설날·추석 연휴(3일)
  const singles = new Set<string>(); // 단일 공휴일 중 대체공휴일 대상

  for (const [md, name] of Object.entries(SOLAR)) {
    const [mm, dd] = md.split("-").map(Number);
    const k = key(year, mm - 1, dd);
    base.set(k, name);
    if (SUBSTITUTABLE.has(name)) singles.add(k);
  }

  for (let m = 0; m < 12; m++) {
    const days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    for (let d = 1; d <= days; d++) {
      const l = lunarOf(year, m, d);
      if (l.leap) continue;
      let name: string | null = null;
      if (l.month === 1 && l.day === 1) name = "설날";
      else if (l.month === 8 && l.day === 15) name = "추석";
      else if (l.month === 4 && l.day === 8) name = "부처님오신날";
      if (!name) continue;

      if (name === "부처님오신날") {
        const k = key(year, m, d);
        base.set(k, base.has(k) ? `${base.get(k)}·${name}` : name);
        singles.add(k);
        continue;
      }
      const label = name === "설날" ? "설날연휴" : "추석연휴";
      const trio = [-1, 0, 1].map((n) => {
        const [yy, mm, dd] = addDays(year, m, d, n);
        const k = key(yy, mm, dd);
        base.set(k, n === 0 ? name! : label);
        return k;
      });
      groups.push(trio);
    }
  }

  const all = new Map(base);
  const taken = (k: string) => all.has(k);
  const substituteAfter = (fromKey: string) => {
    let [y, m, d] = fromKey.split("-").map(Number);
    m -= 1;
    for (let i = 0; i < 14; i++) {
      [y, m, d] = addDays(y, m, d, 1);
      const w = dayOfWeek(y, m, d);
      const k = key(y, m, d);
      if (w !== 0 && w !== 6 && !taken(k)) return k;
    }
    return null;
  };
  const isWeekend = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    const w = dayOfWeek(y, m - 1, d);
    return w === 0 || w === 6;
  };
  const isSunday = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return dayOfWeek(y, m - 1, d) === 0;
  };

  const ordered: { last: string; trigger: boolean; label: string }[] = [];
  for (const g of groups) {
    ordered.push({ last: g[2], trigger: g.some(isSunday), label: `${all.get(g[1])} 대체공휴일` });
  }
  for (const k of singles) {
    const overlap = (base.get(k) ?? "").includes("·");
    ordered.push({ last: k, trigger: isWeekend(k) || overlap, label: `${(base.get(k) ?? "").split("·")[0]} 대체공휴일` });
  }
  ordered.sort((a, b) => (a.last < b.last ? -1 : 1));
  for (const o of ordered) {
    if (!o.trigger) continue;
    const sub = substituteAfter(o.last);
    if (sub) all.set(sub, o.label);
  }

  for (const [k, name] of Object.entries(EXTRA)) {
    if (k.startsWith(`${year}-`)) all.set(k, name);
  }

  cache.set(year, all);
  return all;
}

/** 해당 날짜가 법정 공휴일(대체공휴일 포함)이면 이름을, 아니면 null을 돌려준다. 로컬 날짜(연·월·일) 기준. */
export function publicHolidayName(date: Date): string | null {
  return holidaysOf(date.getFullYear()).get(key(date.getFullYear(), date.getMonth(), date.getDate())) ?? null;
}
