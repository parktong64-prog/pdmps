"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/lib/admin/status";
import { WEEKDAY_LABEL, TIMES, BLOCKED, dateKey, isClosedDay } from "@/lib/booking";
import { getWeekSlots, cancelReservationSlot, blockSlot, reopenSlot, type SlotCell } from "@/lib/admin/actions";

// 주 시작일(일요일 기준) 2개 주 제공
const WEEK_STARTS = [
  { y: 2026, m: 8, d: 13 }, // 9.13(일) ~ 9.19(토)
  { y: 2026, m: 8, d: 20 }, // 9.20(일) ~ 9.26(토)
];

type Selected = { y: number; m: number; d: number; time: string; key: string };

export default function ReservationsPage() {
  const [weekIdx, setWeekIdx] = useState(0);
  const [slots, setSlots] = useState<Record<string, SlotCell> | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [pending, setPending] = useState(false);

  const dates = useMemo(() => {
    const { y, m, d } = WEEK_STARTS[weekIdx];
    return Array.from({ length: 7 }, (_, i) => new Date(y, m, d + i));
  }, [weekIdx]);

  const reload = useCallback(() => {
    const { y, m, d } = WEEK_STARTS[weekIdx];
    getWeekSlots(y, m, d).then(setSlots);
  }, [weekIdx]);

  useEffect(() => {
    reload();
  }, [reload]);

  function cellData(d: Date, time: string): SlotCell {
    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
    return slots?.[key] ?? { status: "open" };
  }

  function selectCell(d: Date, time: string) {
    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
    setSelected({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), time, key });
  }

  function changeWeek(next: number) {
    setWeekIdx(Math.max(0, Math.min(WEEK_STARTS.length - 1, next)));
    setSelected(null);
  }

  async function runAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    try {
      const res = await fn();
      if (!res.ok && res.error) alert(res.error);
      reload();
    } finally {
      setPending(false);
    }
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

        {slots === null ? (
          <div className="py-10 text-center text-[0.82rem] text-[var(--ink-soft)]">불러오는 중…</div>
        ) : (
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
                    const closed = isClosedDay(d);
                    const cell = cellData(d, time);
                    const status = closed ? "closed" : cell.status;
                    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
                    const isSelected = selected?.key === key;
                    const label =
                      status === "closed"
                        ? BLOCKED[dateKey(d.getFullYear(), d.getMonth(), d.getDate())] || "휴진"
                        : status === "booked" || status === "pending"
                          ? cell.patientName
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
                        } ${status === "pending" ? "bg-[var(--st-pending-soft)] font-bold text-[var(--st-pending)]" : ""} ${
                          status === "open" ? "text-[var(--ink-faint)] hover:bg-[var(--accent-soft)]" : ""
                        } ${status === "closed" ? "cursor-default text-[var(--ink-faint)]" : "cursor-pointer"} ${
                          isSelected ? "outline outline-2 -outline-offset-2 outline-[var(--accent)]" : ""
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}

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
            cell={cellData(new Date(selected.y, selected.m, selected.d), selected.time)}
            pending={pending}
            onCancel={() => runAction(() => cancelReservationSlot(selected.key.split("_")[0], selected.time))}
            onBlock={() => runAction(() => blockSlot(selected.key.split("_")[0], selected.time))}
            onReopen={() => runAction(() => reopenSlot(selected.key.split("_")[0], selected.time))}
          />
        )}
      </div>
    </div>
  );
}

function SlotDetail({
  selected,
  cell,
  pending,
  onCancel,
  onBlock,
  onReopen,
}: {
  selected: Selected;
  cell: SlotCell;
  pending: boolean;
  onCancel: () => void;
  onBlock: () => void;
  onReopen: () => void;
}) {
  const when = `${selected.m + 1}월 ${selected.d}일(${WEEKDAY_LABEL[new Date(selected.y, selected.m, selected.d).getDay()]}) ${selected.time}`;

  if (cell.status === "booked") {
    return (
      <div>
        <Row label="환자" value={cell.patientName ?? "-"} />
        <Row label="연락처" value={cell.patientPhone ?? "-"} />
        <Row label="시술" value="Face Lift" />
        <Row label="일시" value={when} />
        <div className="flex justify-between border-b border-[var(--line)] py-1.5 text-[0.84rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="done" label="확정" />
        </div>
        <div className="mt-3.5">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-lg bg-[var(--danger-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--danger)] disabled:opacity-50"
          >
            예약 취소
          </button>
        </div>
      </div>
    );
  }

  if (cell.status === "pending") {
    return (
      <div>
        <Row label="환자" value={cell.patientName ?? "-"} />
        <Row label="연락처" value={cell.patientPhone ?? "-"} />
        <Row label="시술" value="Face Lift" />
        <Row label="일시" value={when} />
        <div className="flex justify-between border-b border-[var(--line)] py-1.5 text-[0.84rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="pending" label="결제 대기중" />
        </div>
        <p className="mt-2.5 text-[0.72rem] text-[var(--ink-soft)]">
          결제창으로 이동했지만 아직 승인되지 않았습니다. 오래 방치된 경우 취소해서 슬롯을 다시 열 수 있어요.
        </p>
        <div className="mt-3.5">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-lg bg-[var(--danger-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--danger)] disabled:opacity-50"
          >
            대기 취소하고 슬롯 열기
          </button>
        </div>
      </div>
    );
  }

  if (cell.status === "blocked") {
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
            disabled={pending}
            onClick={onReopen}
            className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)] disabled:opacity-50"
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
          disabled={pending}
          onClick={onBlock}
          className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)] disabled:opacity-50"
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
