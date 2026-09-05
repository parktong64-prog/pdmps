"use client";

import { Fragment, useMemo, useState } from "react";
import { StatusPill } from "@/lib/admin/status";
import { WEEKDAY_LABEL, TIMES, BLOCKED, hash, dateKey, isNaturallyBooked, isClosedDay } from "@/lib/booking";

const NAMES = ["이은지", "박서연", "최유리", "한소민", "오지훈", "배수아", "문태현", "강하은"];

// 주 시작일(일요일 기준) 2개 주 제공
const WEEK_STARTS = [
  new Date(2026, 8, 13), // 9.13(일) ~ 9.19(토)
  new Date(2026, 8, 20), // 9.20(일) ~ 9.26(토)
];

function nameFor(key: string, time: string) {
  return NAMES[hash(key + time + "name") % NAMES.length];
}

type CellStatus = "closed" | "booked" | "blocked" | "open";
type Selected = { y: number; m: number; d: number; time: string; key: string };
type Override = "open" | "blocked";

export default function ReservationsPage() {
  const [weekIdx, setWeekIdx] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [cancelledKeys, setCancelledKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selected | null>(null);

  const dates = useMemo(() => {
    const start = WEEK_STARTS[weekIdx];
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [weekIdx]);

  function cellStatus(d: Date, time: string): CellStatus {
    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
    if (isClosedDay(d)) return "closed";
    if (overrides[key]) return overrides[key];
    return isNaturallyBooked(dateKey(d.getFullYear(), d.getMonth(), d.getDate()), time) ? "booked" : "open";
  }

  function selectCell(d: Date, time: string) {
    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
    setSelected({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), time, key });
    // 같은 슬롯을 다시 선택하면 이전에 "취소 완료"로 고정됐던 패널을 최신 상태로 되돌린다.
    setCancelledKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function changeWeek(next: number) {
    setWeekIdx(Math.max(0, Math.min(WEEK_STARTS.length - 1, next)));
    setSelected(null);
  }

  const first = dates[0];
  const last = dates[6];
  const weekLabel = `${first.getMonth() + 1}.${first.getDate()} ~ ${last.getMonth() + 1}.${last.getDate()}`;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">예약 관리</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">박동만 원장</div>
      </div>

      <div className="mb-4 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 주"
            disabled={weekIdx === 0}
            onClick={() => changeWeek(weekIdx - 1)}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--line)] text-[0.85rem] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
          <div className="font-[family-name:var(--font-display)] text-[1rem] font-bold">{weekLabel}</div>
          <button
            type="button"
            aria-label="다음 주"
            disabled={weekIdx === WEEK_STARTS.length - 1}
            onClick={() => changeWeek(weekIdx + 1)}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--line)] text-[0.85rem] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-[56px_repeat(7,1fr)] gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] text-[0.74rem]">
            <div className="bg-[var(--page-bg)]" />
            {dates.map((d) => {
              const closed = isClosedDay(d);
              return (
                <div key={d.toISOString()} className={`bg-[var(--page-bg)] px-1 pt-2.5 text-center`}>
                  <div className={`text-[0.64rem] ${closed ? "text-[var(--ink-faint)]" : "text-[var(--ink-soft)]"}`}>
                    {WEEKDAY_LABEL[d.getDay()]}
                  </div>
                  <div className={`font-[family-name:var(--font-mono-kr)] text-[0.92rem] font-semibold ${closed ? "text-[var(--ink-faint)]" : ""}`}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}

            {TIMES.map((time) => (
              <Fragment key={time}>
                <div className="flex items-center justify-center bg-[var(--card-bg)] font-[family-name:var(--font-mono-kr)] text-[var(--ink-soft)]">
                  {time}
                </div>
                {dates.map((d) => {
                  const status = cellStatus(d, time);
                  const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
                  const isSelected = selected?.key === key;
                  const label =
                    status === "closed"
                      ? BLOCKED[dateKey(d.getFullYear(), d.getMonth(), d.getDate())] || "휴진"
                      : status === "booked"
                        ? nameFor(dateKey(d.getFullYear(), d.getMonth(), d.getDate()), time)
                        : status === "blocked"
                          ? "차단"
                          : "";
                  const stripe =
                    status === "closed" || status === "blocked"
                      ? "bg-[repeating-linear-gradient(45deg,var(--page-bg),var(--page-bg)_4px,var(--line)_4px,var(--line)_8px)]"
                      : "bg-[var(--card-bg)]";
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={status === "closed"}
                      onClick={() => status !== "closed" && selectCell(d, time)}
                      className={`min-h-[46px] px-1 py-2 text-center leading-[1.25] ${stripe} ${
                        status === "booked" ? "bg-[var(--accent-soft)] font-bold text-[var(--accent-ink)]" : ""
                      } ${status === "open" ? "text-[var(--ink-faint)] hover:bg-[var(--accent-soft)]" : ""} ${
                        status === "closed" ? "cursor-default text-[var(--ink-faint)]" : "cursor-pointer"
                      } ${isSelected ? "outline outline-2 -outline-offset-2 outline-[var(--accent)]" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-4 text-[0.7rem] text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[3px] border border-[var(--line)] bg-[var(--card-bg)]" />
            예약 가능
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[var(--accent-soft)]" />
            예약됨 (클릭 시 상세)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[repeating-linear-gradient(45deg,var(--page-bg),var(--page-bg)_3px,var(--line)_3px,var(--line)_6px)]" />
            휴진 · 차단
          </span>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        <div className="mb-3.5 text-[0.82rem] font-bold">슬롯 상세</div>
        {!selected ? (
          <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">
            슬롯을 선택하면 상세 정보가 여기에 표시됩니다.
          </div>
        ) : (
          <SlotDetail
            selected={selected}
            status={cellStatus(new Date(selected.y, selected.m, selected.d), selected.time)}
            cancelled={cancelledKeys.has(selected.key)}
            onCancel={() => {
              setOverrides((prev) => ({ ...prev, [selected.key]: "open" }));
              setCancelledKeys((prev) => new Set(prev).add(selected.key));
            }}
            onBlock={() => setOverrides((prev) => ({ ...prev, [selected.key]: "blocked" }))}
            onReopen={() => setOverrides((prev) => ({ ...prev, [selected.key]: "open" }))}
          />
        )}
      </div>
    </div>
  );
}

function SlotDetail({
  selected,
  status,
  cancelled,
  onCancel,
  onBlock,
  onReopen,
}: {
  selected: Selected;
  status: CellStatus;
  cancelled: boolean;
  onCancel: () => void;
  onBlock: () => void;
  onReopen: () => void;
}) {
  const when = `${selected.m + 1}월 ${selected.d}일(${WEEKDAY_LABEL[new Date(selected.y, selected.m, selected.d).getDay()]}) ${selected.time}`;
  const key = `${dateKey(selected.y, selected.m, selected.d)}`;

  // 예약 취소를 누르면 슬롯 자체는 open이 되지만, 확인 차원에서 이 패널은
  // "취소 완료" 상태로 고정 표시한다 (원본 프로토타입과 동일한 동작).
  if (cancelled) {
    const patient = nameFor(key, selected.time);
    return (
      <div>
        <Row label="환자" value={patient} />
        <Row label="연락처" value={`010-****-${1000 + (hash(patient) % 9000)}`} />
        <Row label="시술" value="Face Lift" />
        <Row label="일시" value={when} />
        <div className="flex justify-between border-b border-[var(--line)] py-1.5 text-[0.84rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="done" label="확정" />
        </div>
        <div className="mt-3.5">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg bg-[var(--danger-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--danger)] opacity-50"
          >
            취소 완료
          </button>
        </div>
      </div>
    );
  }

  if (status === "booked") {
    const patient = nameFor(key, selected.time);
    return (
      <div>
        <Row label="환자" value={patient} />
        <Row label="연락처" value={`010-****-${1000 + (hash(patient) % 9000)}`} />
        <Row label="시술" value="Face Lift" />
        <Row label="일시" value={when} />
        <div className="flex justify-between border-b border-[var(--line)] py-1.5 text-[0.84rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="done" label="확정" />
        </div>
        <div className="mt-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-[var(--danger-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--danger)]"
          >
            예약 취소
          </button>
        </div>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div>
        <Row label="일시" value={when} />
        <div className="flex justify-between border-b border-[var(--line)] py-1.5 text-[0.84rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="cancel" label="관리자 차단" />
        </div>
        <div className="mt-3.5">
          <button
            type="button"
            onClick={onReopen}
            className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)]"
          >
            슬롯 열기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Row label="일시" value={when} />
      <div className="flex justify-between border-b border-[var(--line)] py-1.5 text-[0.84rem]">
        <span className="text-[var(--ink-soft)]">상태</span>
        <StatusPill status="progress" label="예약 가능" />
      </div>
      <div className="mt-3.5">
        <button
          type="button"
          onClick={onBlock}
          className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)]"
        >
          슬롯 막기
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--line)] py-1.5 text-[0.84rem]">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <b className="font-semibold">{value}</b>
    </div>
  );
}
