"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WEEKDAY_LABEL, TIMES, BLOCKED, dateKey, isClosedDay, isRedDay, redDayName } from "@/lib/booking";
import {
  getMonthSlotStates,
  setDayOpen,
  applyDayPatterns,
  applyWeekdayPattern,
  type TimeState,
} from "@/lib/schedule/actions";

const now = new Date();
const MONTHS = [0, 1, 2].map((i) => {
  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
});
const TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());

function cellState(blockedCount: number, closedDay: boolean): "full" | "partial" | "none" {
  if (closedDay) return "none";
  if (blockedCount === 0) return "full";
  return blockedCount < TIMES.length ? "partial" : "none";
}

type SelectedDate = { y: number; m: number; d: number; key: string };

export default function SchedulePage() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [slotStates, setSlotStates] = useState<Record<string, TimeState> | null>(null);
  const [selection, setSelection] = useState<SelectedDate[]>([]);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { y, m } = MONTHS[monthIdx];
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const reload = useCallback(() => {
    getMonthSlotStates(y, m).then(setSlotStates);
  }, [y, m]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  function timesFor(yy: number, mm: number, dd: number) {
    const key = dateKey(yy, mm, dd);
    const blocked = TIMES.filter((t) => slotStates?.[`${key}_${t}`] === "blocked");
    const booked = TIMES.filter((t) => slotStates?.[`${key}_${t}`] === "booked");
    return { blocked, booked };
  }

  const selectable = (d: number) => {
    const date = new Date(y, m, d);
    return date >= TODAY && !isClosedDay(date);
  };
  const toItem = (d: number): SelectedDate => ({ y, m, d, key: dateKey(y, m, d) });

  // 일반 클릭 = 하나만 선택, Ctrl/⌘ 클릭 = 추가·해제, Shift 클릭 = 마지막으로 누른 날짜부터 범위 선택
  function selectDate(d: number, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
    if (e.shiftKey && anchor !== null) {
      const [from, to] = anchor < d ? [anchor, d] : [d, anchor];
      setSelection(Array.from({ length: to - from + 1 }, (_, i) => from + i).filter(selectable).map(toItem));
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      const key = dateKey(y, m, d);
      setSelection((prev) => (prev.some((s) => s.key === key) ? prev.filter((s) => s.key !== key) : [...prev, toItem(d)]));
      setAnchor(d);
      return;
    }
    setSelection([toItem(d)]);
    setAnchor(d);
  }

  function clearSelection() {
    setSelection([]);
    setAnchor(null);
  }

  async function runAction(fn: () => Promise<unknown>, msg: string) {
    setPending(true);
    try {
      await fn();
      reload();
      showToast(msg);
    } finally {
      setPending(false);
    }
  }

  function toggleDayOpen(checked: boolean) {
    if (!selected) return;
    runAction(() => setDayOpen(selected.key, checked), checked ? "이 날을 열었어요" : "이 날을 닫았어요");
  }

  // 선택한 모든 날짜에서 클릭한 시간만 상태를 뒤집고 나머지는 그대로 유지한다.
  // 하나라도 막혀 있으면 전부 열고, 전부 열려 있을 때만 전부 막는다.
  function toggleTime(time: string) {
    if (infos.length === 0) return;
    const willOpen = infos.some((i) => i.blocked.includes(time));
    runAction(
      () =>
        applyDayPatterns(
          infos.map((i) => ({
            dateStr: i.key,
            openTimes: TIMES.filter((t) => (t === time ? willOpen : !i.blocked.includes(t))),
          })),
        ),
      "저장되었습니다",
    );
  }

  function setAll(on: boolean) {
    if (infos.length === 0) return;
    runAction(
      () => applyDayPatterns(infos.map((i) => ({ dateStr: i.key, openTimes: on ? [...TIMES] : [] }))),
      on ? "전체 시간을 열었어요" : "전체 시간을 닫았어요",
    );
  }

  function applyToWeekday() {
    if (!selected) return;
    const { blocked } = timesFor(selected.y, selected.m, selected.d);
    const openTimes = TIMES.filter((t) => !blocked.includes(t));
    const targetWeekday = new Date(selected.y, selected.m, selected.d).getDay();
    runAction(
      () => applyWeekdayPattern(selected.y, selected.m, targetWeekday, openTimes),
      `이 달의 ${WEEKDAY_LABEL[targetWeekday]}요일에 동일하게 적용했어요`,
    );
  }

  const selected = selection.length === 1 ? selection[0] : null;
  const infos = selection.map((s) => ({ ...s, ...timesFor(s.y, s.m, s.d) }));
  const selectedInfo = selected ? timesFor(selected.y, selected.m, selected.d) : null;
  const selectedClosedFixed = selected ? isClosedDay(new Date(selected.y, selected.m, selected.d)) : false;
  const selectedDayOpen = selectedInfo ? selectedInfo.blocked.length < TIMES.length : false;
  const multi = selection.length > 1;
  const sortedSelection = [...selection].sort((a, b) => a.d - b.d);

  return (
    <div className="-mt-7 -mb-7 pt-3 pb-3">
      <div className="mb-1.5 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">일정 설정</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">환자용 예약 캘린더에 그대로 반영돼요</div>
      </div>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 달"
            disabled={monthIdx === 0}
            onClick={() => {
              setMonthIdx((i) => Math.max(0, i - 1));
              clearSelection();
            }}
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
            onClick={() => {
              setMonthIdx((i) => Math.min(MONTHS.length - 1, i + 1));
              clearSelection();
            }}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--line)] text-[0.85rem] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="mb-0.5 grid grid-cols-7">
          {WEEKDAY_LABEL.map((w, i) => (
            <span key={w} className={`py-0.5 text-center text-[0.7rem] ${i === 0 || i === 6 ? "text-[var(--danger)]" : "text-[var(--ink-soft)]"}`}>
              {w}
            </span>
          ))}
        </div>

        {slotStates === null ? (
          <div className="py-5 text-center text-[0.82rem] text-[var(--ink-soft)]">불러오는 중…</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`b-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const date = new Date(y, m, d);
              const closedFixed = isClosedDay(date);
              const { blocked } = timesFor(y, m, d);
              const state = cellState(blocked.length, closedFixed);
              const isPast = date < TODAY;
              const disabled = isPast || closedFixed;
              const isSelected = selection.some((s) => s.key === dateKey(y, m, d));
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  title={closedFixed ? BLOCKED[dateKey(y, m, d)] || redDayName(date) || "정기 휴진" : (redDayName(date) ?? undefined)}
                  onClick={(e) => !disabled && selectDate(d, e)}
                  className={`flex h-9 select-none flex-col items-center justify-center gap-0.5 rounded-lg font-[family-name:var(--font-mono-kr)] text-[0.78rem] transition-colors ${
                    isSelected
                      ? "bg-[var(--accent)] text-white"
                      : disabled
                        ? `cursor-not-allowed bg-[var(--page-bg)] ${isRedDay(date) ? "text-[var(--danger)]" : "text-[var(--ink-faint)]"}`
                        : `bg-[var(--page-bg)] ${isRedDay(date) ? "text-[var(--danger)]" : "text-[var(--ink)]"} hover:bg-[var(--accent-soft)]`
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
        )}

        <div className="mt-1.5 flex flex-wrap gap-4 text-[0.7rem] text-[var(--ink-soft)]">
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

      <div className="mt-1.5 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-2.5">
        {selection.length === 0 ? (
          <>
            <div className="mb-1.5 text-[0.82rem] font-bold">날짜를 선택해주세요</div>
            <div className="py-3 text-center text-[0.82rem] text-[var(--ink-soft)]">
              위 달력에서 설정할 날짜를 선택하세요.
              <div className="mt-1 text-[0.72rem]">
                Ctrl(맥은 ⌘)을 누른 채 클릭하면 여러 날짜를, Shift를 누른 채 클릭하면 범위를 한 번에 선택할 수 있어요.
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="text-[0.82rem] font-bold">
                {selected
                  ? `${selected.m + 1}월 ${selected.d}일(${WEEKDAY_LABEL[new Date(selected.y, selected.m, selected.d).getDay()]}) 설정`
                  : `${selection.length}일 선택됨 · ${sortedSelection.map((s) => `${s.m + 1}/${s.d}`).join(", ")}`}
              </div>
              {multi && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="flex-none rounded-lg border border-[var(--line)] px-2.5 py-1 text-[0.72rem] text-[var(--ink-soft)]"
                >
                  선택 해제
                </button>
              )}
            </div>

            {selected && (
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.84rem] font-semibold">이 날 진료 여부</span>
              <label className="relative inline-block h-6 w-[42px]">
                <input
                  type="checkbox"
                  checked={selectedDayOpen}
                  disabled={pending || selectedClosedFixed}
                  onChange={(e) => toggleDayOpen(e.target.checked)}
                  className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
                <span className="absolute inset-0 rounded-full bg-[var(--line)] transition-colors peer-checked:bg-[var(--accent)]" />
                <span className="absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform peer-checked:translate-x-[18px]" />
              </label>
            </div>
            )}
            {selected && selectedClosedFixed && (
              <p className="-mt-2.5 mb-4 text-[0.72rem] text-[var(--ink-soft)]">
                정기 휴진일이라 여기서 변경할 수 없어요.
              </p>
            )}

            <div className="mb-2 flex flex-wrap gap-2">
              {TIMES.map((t) => {
                const isBooked = infos.every((i) => i.booked.includes(t));
                const blockedCount = infos.filter((i) => i.blocked.includes(t)).length;
                const mixed = blockedCount > 0 && blockedCount < infos.length;
                const on = blockedCount === 0;
                // 여러 날짜 선택 시에는 일부 날짜만 막혀 있는 "혼합" 상태도 표시한다.
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={pending || isBooked || (selected ? selectedClosedFixed || !selectedDayOpen : false)}
                    title={
                      isBooked
                        ? "이미 예약된 시간입니다 · 예약 관리에서 확인하세요"
                        : mixed
                          ? "날짜마다 상태가 달라요 · 누르면 모두 열어요"
                          : undefined
                    }
                    onClick={() => toggleTime(t)}
                    className={`rounded-full border px-3.5 py-2 font-[family-name:var(--font-mono-kr)] text-[0.8rem] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      isBooked
                        ? "border-[var(--st-progress)] bg-[var(--st-progress-soft)] text-[var(--st-progress)]"
                        : mixed
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                          : on
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-[var(--line)] bg-[var(--card-bg)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {t}
                    {isBooked ? " · 예약됨" : mixed ? " · 일부" : ""}
                  </button>
                );
              })}
            </div>

            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || (selected ? selectedClosedFixed : false)}
                onClick={() => setAll(true)}
                className="rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1.5 text-[0.74rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                전체 시간 켜기
              </button>
              <button
                type="button"
                disabled={pending || (selected ? selectedClosedFixed : false)}
                onClick={() => setAll(false)}
                className="rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1.5 text-[0.74rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                전체 시간 끄기
              </button>
              {selected && (
                <button
                  type="button"
                  disabled={pending || selectedClosedFixed}
                  onClick={applyToWeekday}
                  className="rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1.5 text-[0.74rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이 요일 전체에 적용
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
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
