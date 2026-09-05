"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WEEKDAY_LABEL, TIMES, BLOCKED, dateKey, isClosedDay } from "@/lib/booking";
import { getMonthSlotStates, type TimeState } from "@/lib/schedule/actions";

const now = new Date();
// 병원이 예약을 열어둔 기간: 이번 달부터 2개월 뒤까지
const MONTHS = [0, 1, 2].map((i) => {
  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
});
const TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());

function dayStatus(y: number, m: number, d: number, slotStates: Record<string, TimeState>) {
  const key = dateKey(y, m, d);
  const date = new Date(y, m, d);
  if (date < TODAY) return { open: false, reason: null as string | null, title: undefined as string | undefined };
  if (isClosedDay(date)) return { open: false, reason: "휴", title: BLOCKED[key] };
  const hasOpenTime = TIMES.some((t) => !slotStates[`${key}_${t}`]);
  if (!hasOpenTime) return { open: false, reason: "마감", title: undefined };
  return { open: true, reason: null, title: undefined };
}

type Selected = { y: number; m: number; d: number; key: string; weekday: string; time: string | null };

export default function SchedulePage() {
  const router = useRouter();
  const [monthIndex, setMonthIndex] = useState(0);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [slotStates, setSlotStates] = useState<Record<string, TimeState> | null>(null);

  const { y, m } = MONTHS[monthIndex];
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const reload = useCallback(() => {
    getMonthSlotStates(y, m).then(setSlotStates);
  }, [y, m]);

  useEffect(() => {
    reload();
  }, [reload]);

  const days = useMemo(() => {
    if (!slotStates) return [];
    const arr: { d: number; status: ReturnType<typeof dayStatus>; isToday: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({
        d,
        status: dayStatus(y, m, d, slotStates),
        isToday: y === TODAY.getFullYear() && m === TODAY.getMonth() && d === TODAY.getDate(),
      });
    }
    return arr;
  }, [y, m, daysInMonth, slotStates]);

  function openTimeView(d: number) {
    const key = dateKey(y, m, d);
    const weekday = WEEKDAY_LABEL[new Date(y, m, d).getDay()];
    setSelected({ y, m, d, key, weekday, time: null });
  }

  function pickTime(time: string) {
    setSelected((prev) => (prev ? { ...prev, time } : prev));
  }

  const when = selected?.time
    ? `${selected.m + 1}월 ${selected.d}일(${selected.weekday}) ${selected.time}`
    : null;

  function handleNext() {
    if (!selected?.time) return;
    const params = new URLSearchParams({
      date: selected.key,
      time: selected.time,
      when: when ?? "",
    });
    router.push(`/consult/checkout?${params.toString()}`);
  }

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[520px] px-5 py-12 pb-24">
        <div className="mb-6">
          <div className="mb-2.5 text-xs font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
            Face Lift 전문 · 박동만 원장
          </div>
          <h1 className="mb-2.5 font-[family-name:var(--font-display)] text-[1.6rem] font-bold">
            예약 캘린더
          </h1>
          <p className="text-[0.88rem] leading-[1.65] text-[var(--ink-soft)]">
            병원에서 열어둔 날짜 중 원하는 날을 고르면, 그 날의 예약 가능한 시간을 선택할 수
            있어요.
          </p>
        </div>

        {!selected ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                aria-label="이전 달"
                disabled={monthIndex === 0}
                onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[0.9rem] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ‹
              </button>
              <div className="font-[family-name:var(--font-display)] text-[1.05rem] font-bold">
                {y}년 {m + 1}월
              </div>
              <button
                type="button"
                aria-label="다음 달"
                disabled={monthIndex === MONTHS.length - 1}
                onClick={() => setMonthIndex((i) => Math.min(MONTHS.length - 1, i + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[0.9rem] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ›
              </button>
            </div>

            <div className="mb-3.5 flex gap-4 text-[0.68rem] text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                예약 가능
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]" />
                휴진 · 마감
              </span>
            </div>

            <div className="mb-1 grid grid-cols-7">
              {WEEKDAY_LABEL.map((w, i) => (
                <span
                  key={w}
                  className={`py-1 text-center text-[0.68rem] ${i === 0 ? "text-[#c0605f]" : "text-[var(--ink-soft)]"}`}
                >
                  {w}
                </span>
              ))}
            </div>

            {slotStates === null ? (
              <div className="py-10 text-center text-[0.82rem] text-[var(--ink-soft)]">불러오는 중…</div>
            ) : (
              <div className="grid grid-cols-7 gap-[3px]">
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {days.map(({ d, status, isToday }) => (
                  <button
                    key={d}
                    type="button"
                    disabled={!status.open}
                    title={status.title}
                    onClick={() => status.open && openTimeView(d)}
                    className={`relative flex aspect-square flex-col items-center justify-center gap-[3px] rounded-lg font-[family-name:var(--font-mono-kr)] text-[0.8rem] ${
                      status.open
                        ? "cursor-pointer text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                        : "cursor-not-allowed text-[var(--ink-faint)]"
                    } ${isToday ? "shadow-[inset_0_0_0_1.4px_var(--accent-ink)]" : ""}`}
                  >
                    <span>{d}</span>
                    {status.open ? (
                      <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                    ) : status.reason ? (
                      <span className="font-[family-name:var(--font-body)] text-[0.52rem] text-[var(--ink-faint)]">
                        {status.reason}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            <p className="mt-3.5 text-center text-[0.7rem] leading-[1.6] text-[var(--ink-soft)]">
              병원 관리자가 등록한 진료 가능 일정 기준입니다. 이후 일정은 순차적으로 열립니다.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-5">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-4 text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2"
            >
              ‹ 다른 날짜 선택
            </button>
            <div className="mb-3.5 text-[0.88rem] font-bold">
              {selected.m + 1}월 {selected.d}일({selected.weekday})
              <span className="mt-0.5 block text-[0.78rem] font-normal text-[var(--ink-soft)]">
                박동만 원장 · 예약 가능 시간
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {TIMES.map((time) => {
                const taken = !!slotStates?.[`${selected.key}_${time}`];
                const isSelected = selected.time === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={taken}
                    onClick={() => pickTime(time)}
                    className={`rounded-lg border py-3 font-[family-name:var(--font-mono-kr)] text-[0.82rem] transition-colors ${
                      taken
                        ? "cursor-not-allowed border-[var(--line)] bg-[var(--page-bg)] text-[var(--line)] line-through"
                        : isSelected
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--line)] bg-[var(--card-bg)] text-[var(--ink)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {taken ? `${time} 마감` : time}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selected && (
          <div className="sticky bottom-4 mt-5 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-[18px] shadow-[0_18px_40px_-24px_rgba(42,31,34,0.35)]">
            <div className="flex justify-between py-0.5 text-[0.82rem] text-[var(--ink-soft)]">
              <span>시술</span>
              <b className="font-semibold text-[var(--ink)]">Face Lift</b>
            </div>
            <div className="flex justify-between py-0.5 text-[0.82rem] text-[var(--ink-soft)]">
              <span>담당</span>
              <b className="font-semibold text-[var(--ink)]">박동만 원장</b>
            </div>
            <div className="flex justify-between py-0.5 text-[0.82rem] text-[var(--ink-soft)]">
              <span>일시</span>
              <b className="font-semibold text-[var(--ink)]">{when ?? "-"}</b>
            </div>
            <button
              type="button"
              disabled={!when}
              onClick={handleNext}
              className="mt-3 block w-full rounded-[10px] bg-[var(--accent)] py-3 text-center text-[0.9rem] font-bold text-white transition-[filter,opacity] hover:brightness-[1.06] disabled:pointer-events-none disabled:opacity-40"
            >
              다음 · 예약자 정보 입력
            </button>
            <div className="mt-2.5 text-center text-[0.68rem] text-[var(--ink-soft)]">
              선택한 시간은 결제 전까지 10분간 임시로 잡아드려요
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
