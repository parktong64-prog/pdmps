"use client";

import { useEffect, useRef, useState } from "react";
import { WEEKDAY_LABEL, TIMES, BLOCKED, dateKey } from "@/lib/booking";

const MONTHS = [
  { y: 2026, m: 8 },
  { y: 2026, m: 9 },
  { y: 2026, m: 10 },
];
const TODAY = new Date(2026, 8, 5);

type Entry = { open: boolean; times: Set<string> };

function computeDefault(y: number, m: number, d: number): Entry & { fixedClosed: boolean } {
  const key = dateKey(y, m, d);
  const weekday = new Date(y, m, d).getDay();
  const fixedClosed = !!BLOCKED[key];
  const isPast = new Date(y, m, d) < TODAY;
  const defaultOpen = weekday !== 0 && weekday !== 6 && !fixedClosed && !isPast;
  return { open: defaultOpen, times: new Set(defaultOpen ? TIMES : []), fixedClosed };
}

function cellState(entry: Entry & { fixedClosed: boolean }): "full" | "partial" | "none" {
  if (entry.fixedClosed || !entry.open) return "none";
  if (entry.times.size >= TIMES.length) return "full";
  return entry.times.size > 0 ? "partial" : "none";
}

export default function SchedulePage() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [schedule, setSchedule] = useState<Record<string, Entry>>({});
  const [selected, setSelected] = useState<{ y: number; m: number; d: number; key: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const { y, m } = MONTHS[monthIdx];
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  function getEntry(yy: number, mm: number, dd: number) {
    const key = dateKey(yy, mm, dd);
    const stored = schedule[key];
    const base = computeDefault(yy, mm, dd);
    return stored ? { ...base, ...stored } : base;
  }

  function updateEntry(key: string, y2: number, m2: number, d2: number, updater: (e: Entry) => Entry) {
    setSchedule((prev) => {
      const current = prev[key] ?? computeDefault(y2, m2, d2);
      return { ...prev, [key]: updater(current) };
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  function selectDate(d: number) {
    setSelected({ y, m, d, key: dateKey(y, m, d) });
  }

  function toggleDayOpen(checked: boolean) {
    if (!selected) return;
    updateEntry(selected.key, selected.y, selected.m, selected.d, (e) => ({
      open: checked,
      times: checked ? (e.times.size === 0 ? new Set(TIMES) : e.times) : new Set(),
    }));
  }

  function toggleTime(time: string) {
    if (!selected) return;
    updateEntry(selected.key, selected.y, selected.m, selected.d, (e) => {
      const next = new Set(e.times);
      if (next.has(time)) next.delete(time);
      else next.add(time);
      return { ...e, times: next };
    });
  }

  function setAll(on: boolean) {
    if (!selected) return;
    updateEntry(selected.key, selected.y, selected.m, selected.d, (e) => ({
      ...e,
      times: on ? new Set(TIMES) : new Set(),
    }));
  }

  function applyToWeekday() {
    if (!selected) return;
    const source = getEntry(selected.y, selected.m, selected.d);
    const targetWeekday = new Date(selected.y, selected.m, selected.d).getDay();
    let applied = 0;
    setSchedule((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        if (date.getDay() !== targetWeekday) continue;
        const key = dateKey(y, m, d);
        const base = computeDefault(y, m, d);
        if (base.fixedClosed || date < TODAY) continue;
        next[key] = { open: source.open, times: new Set(source.times) };
        applied++;
      }
      return next;
    });
    showToast(`이 달의 ${WEEKDAY_LABEL[targetWeekday]}요일 ${applied}일에 동일하게 적용했어요`);
  }

  const selectedEntry = selected ? getEntry(selected.y, selected.m, selected.d) : null;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">일정 설정</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">환자용 예약 캘린더에 그대로 반영돼요</div>
      </div>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 달"
            disabled={monthIdx === 0}
            onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--line)] text-[0.85rem] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
          <div className="font-[family-name:var(--font-display)] text-[1rem] font-bold">
            {y}년 {m + 1}월
          </div>
          <button
            type="button"
            aria-label="다음 달"
            disabled={monthIdx === MONTHS.length - 1}
            onClick={() => setMonthIdx((i) => Math.min(MONTHS.length - 1, i + 1))}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--line)] text-[0.85rem] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7">
          {WEEKDAY_LABEL.map((w, i) => (
            <span key={w} className={`py-1 text-center text-[0.7rem] ${i === 0 ? "text-[#c0605f]" : "text-[var(--ink-soft)]"}`}>
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`b-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const entry = getEntry(y, m, d);
            const state = cellState(entry);
            const isPast = new Date(y, m, d) < TODAY;
            const disabled = isPast || entry.fixedClosed;
            const isSelected = selected?.key === dateKey(y, m, d);
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                title={entry.fixedClosed ? BLOCKED[dateKey(y, m, d)] : undefined}
                onClick={() => !disabled && selectDate(d)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg font-[family-name:var(--font-mono-kr)] text-[0.82rem] transition-colors ${
                  isSelected
                    ? "bg-[var(--accent)] text-white"
                    : disabled
                      ? "cursor-not-allowed bg-[var(--page-bg)] text-[var(--ink-faint)]"
                      : "bg-[var(--page-bg)] text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                <span>{d}</span>
                <span
                  className={`h-1 w-4 rounded-sm ${
                    isSelected
                      ? "bg-white/85"
                      : state === "full"
                        ? "bg-[var(--st-done)]"
                        : state === "partial"
                          ? "bg-[var(--st-pending)]"
                          : "bg-[var(--line)]"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-3.5 flex flex-wrap gap-4 text-[0.7rem] text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-1 w-3.5 rounded-sm bg-[var(--st-done)]" />
            전체 시간 오픈
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-1 w-3.5 rounded-sm bg-[var(--st-pending)]" />
            일부만 오픈
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-1 w-3.5 rounded-sm bg-[var(--line)]" />
            휴진
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-5">
        {!selected || !selectedEntry ? (
          <>
            <div className="mb-3.5 text-[0.82rem] font-bold">날짜를 선택해주세요</div>
            <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">
              위 달력에서 설정할 날짜를 선택하세요.
            </div>
          </>
        ) : (
          <>
            <div className="mb-3.5 text-[0.82rem] font-bold">
              {selected.m + 1}월 {selected.d}일({WEEKDAY_LABEL[new Date(selected.y, selected.m, selected.d).getDay()]}) 설정
            </div>

            <div className="mb-4 flex items-center justify-between">
              <span className="text-[0.84rem] font-semibold">이 날 진료 여부</span>
              <label className="relative inline-block h-6 w-[42px]">
                <input
                  type="checkbox"
                  checked={selectedEntry.open}
                  onChange={(e) => toggleDayOpen(e.target.checked)}
                  className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
                />
                <span className="absolute inset-0 rounded-full bg-[var(--line)] transition-colors peer-checked:bg-[var(--accent)]" />
                <span className="absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform peer-checked:translate-x-[18px]" />
              </label>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {TIMES.map((t) => {
                const on = selectedEntry.open && selectedEntry.times.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!selectedEntry.open}
                    onClick={() => toggleTime(t)}
                    className={`rounded-full border px-3.5 py-2 font-[family-name:var(--font-mono-kr)] text-[0.8rem] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-[var(--card-bg)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <div className="mb-[18px] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAll(true)}
                className="rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1.5 text-[0.74rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)]"
              >
                전체 시간 켜기
              </button>
              <button
                type="button"
                onClick={() => setAll(false)}
                className="rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1.5 text-[0.74rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)]"
              >
                전체 시간 끄기
              </button>
              <button
                type="button"
                onClick={applyToWeekday}
                className="rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1.5 text-[0.74rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)]"
              >
                이 요일 전체에 적용
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => showToast("저장되었습니다 · 환자용 캘린더에 반영됩니다")}
                className="rounded-lg bg-[var(--accent)] px-[18px] py-2.5 text-[0.84rem] font-bold text-white hover:brightness-[1.06]"
              >
                변경사항 저장
              </button>
              <span
                className={`text-[0.78rem] font-semibold text-[var(--st-done)] transition-opacity ${toast ? "opacity-100" : "opacity-0"}`}
              >
                {toast ?? "저장되었습니다"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
