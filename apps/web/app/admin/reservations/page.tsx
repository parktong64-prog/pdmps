"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/lib/admin/status";
import { WEEKDAY_LABEL, TIMES, BLOCKED, dateKey, isClosedDay } from "@/lib/booking";
import {
  getWeekSlots,
  cancelReservationSlot,
  blockSlot,
  reopenSlot,
  blockSlots,
  reopenSlots,
  createAdminReservation,
  type SlotCell,
} from "@/lib/admin/actions";

// 관리자 예약 관리 화면에서는 오전 시간대(10:00, 11:30)를 표시하지 않는다.
const ADMIN_TIMES = TIMES.filter((t) => t !== "10:00" && t !== "11:30");

// 오늘이 속한 주의 일요일 — 여기서부터 3주(21일)를 기본으로 보여준다.
function sundayOf(d: Date) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
const BASE_SUNDAY = sundayOf(new Date());

type Selected = { y: number; m: number; d: number; time: string; key: string };

export default function ReservationsPage() {
  // blockIdx*21일만큼 오프셋된 3주치를 보여준다 (0 = 이번 주 + 다음 2주).
  const [blockIdx, setBlockIdx] = useState(0);
  const [slots, setSlots] = useState<Record<string, SlotCell> | null>(null);
  const [selection, setSelection] = useState<Selected[]>([]);
  const [pending, setPending] = useState(false);
  const selected = selection.length === 1 ? selection[0] : null;

  const weekStarts = useMemo(
    () => [0, 7, 14].map((n) => addDays(BASE_SUNDAY, blockIdx * 21 + n)),
    [blockIdx],
  );
  const weeks = useMemo(
    () => weekStarts.map((start) => Array.from({ length: 7 }, (_, i) => addDays(start, i))),
    [weekStarts],
  );
  const dates = useMemo(() => weeks.flat(), [weeks]);

  const reload = useCallback(() => {
    Promise.all(
      weekStarts.map((start) => getWeekSlots(start.getFullYear(), start.getMonth(), start.getDate())),
    ).then((maps) => setSlots(Object.assign({}, ...maps)));
  }, [weekStarts]);

  useEffect(() => {
    reload();
  }, [reload]);

  function cellData(d: Date, time: string): SlotCell {
    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
    return slots?.[key] ?? { status: "open" };
  }

  // additive(Ctrl/Cmd/Shift 클릭)이면 선택을 누적·토글한다. 막기/열기가 가능한 슬롯(예약 가능·차단)만 다중 선택 대상이다.
  function selectCell(d: Date, time: string, additive: boolean) {
    const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
    const item: Selected = { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), time, key };
    const bulkable = (s: SlotCell["status"]) => s === "open" || s === "blocked";
    if (!additive || !bulkable(cellData(d, time).status)) {
      setSelection([item]);
      return;
    }
    const base = selection.filter((s) => bulkable(cellData(new Date(s.y, s.m, s.d), s.time).status));
    setSelection(base.some((s) => s.key === key) ? base.filter((s) => s.key !== key) : [...base, item]);
  }

  function changeBlock(next: number) {
    setBlockIdx(next);
    setSelection([]);
  }

  async function runAction(fn: () => Promise<{ ok: boolean; error?: string }>, clearSelection = false) {
    setPending(true);
    try {
      const res = await fn();
      if (!res.ok && res.error) alert(res.error);
      if (clearSelection) setSelection([]);
      reload();
    } finally {
      setPending(false);
    }
  }

  const toRefs = (items: Selected[]) => items.map((s) => ({ dateStr: s.key.split("_")[0], time: s.time }));

  const rangeLabel = `${dates[0].getMonth() + 1}.${dates[0].getDate()} ~ ${dates[dates.length - 1].getMonth() + 1}.${dates[dates.length - 1].getDate()}`;

  return (
    <div>
      <div className="mb-2.5 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.2rem] font-bold">예약 관리</h1>
        <div className="text-[0.76rem] text-[var(--ink-soft)]">박동만 원장</div>
      </div>

      <div className="mb-2 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 3주"
            onClick={() => changeBlock(blockIdx - 1)}
            className="flex h-[24px] w-[24px] items-center justify-center rounded-full border border-[var(--line)] text-[0.8rem]"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            <div className="font-[family-name:var(--font-display)] text-[0.9rem] font-bold">{rangeLabel}</div>
            {blockIdx !== 0 && (
              <button
                type="button"
                onClick={() => changeBlock(0)}
                className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[0.64rem] text-[var(--ink-soft)] hover:bg-[var(--accent-soft)]"
              >
                이번 주로
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="다음 3주"
            onClick={() => changeBlock(blockIdx + 1)}
            className="flex h-[24px] w-[24px] items-center justify-center rounded-full border border-[var(--line)] text-[0.8rem]"
          >
            ›
          </button>
        </div>

        {slots === null ? (
          <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">불러오는 중…</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {weeks.map((week) => (
              <WeekGrid
                key={week[0].toISOString()}
                days={week}
                cellData={cellData}
                selection={selection}
                onSelect={selectCell}
              />
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-3 text-[0.66rem] text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2 w-2 rounded-[3px] border border-[var(--line)] bg-[var(--card-bg)]" />
            예약 가능
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2 w-2 rounded-[3px] border border-[var(--success)] bg-[var(--success-soft)]" />
            예약됨 (클릭 시 상세)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2 w-2 rounded-[3px] bg-[repeating-linear-gradient(45deg,var(--page-bg),var(--page-bg)_3px,var(--line)_3px,var(--line)_6px)]" />
            휴진 · 차단
          </span>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-2.5">
        <div className="mb-2 text-[0.8rem] font-bold">슬롯 상세</div>
        {selection.length > 1 ? (
          <BulkDetail
            selection={selection}
            cellData={cellData}
            pending={pending}
            onBlock={(items) => runAction(() => blockSlots(toRefs(items)), true)}
            onReopen={(items) => runAction(() => reopenSlots(toRefs(items)), true)}
            onClear={() => setSelection([])}
          />
        ) : !selected ? (
          <div className="py-3 text-center text-[0.8rem] text-[var(--ink-soft)]">
            슬롯을 선택하면 상세 정보가 여기에 표시됩니다.
            <div className="mt-1 text-[0.7rem]">Ctrl(맥은 ⌘) 또는 Shift를 누른 채 클릭하면 여러 슬롯을 함께 선택할 수 있어요.</div>
          </div>
        ) : (
          <SlotDetail
            selected={selected}
            cell={cellData(new Date(selected.y, selected.m, selected.d), selected.time)}
            pending={pending}
            onCancel={() => runAction(() => cancelReservationSlot(selected.key.split("_")[0], selected.time))}
            onBlock={() => runAction(() => blockSlot(selected.key.split("_")[0], selected.time))}
            onReopen={() => runAction(() => reopenSlot(selected.key.split("_")[0], selected.time))}
            onCreate={(name, phone) =>
              runAction(() => createAdminReservation({ dateStr: selected.key.split("_")[0], time: selected.time, name, phone }))
            }
          />
        )}
      </div>
    </div>
  );
}

/** 한 주(7일) 분량의 시간표 그리드. 3주 표시를 위해 이 블록을 세 번 그린다. */
function WeekGrid({
  days,
  cellData,
  selection,
  onSelect,
}: {
  days: Date[];
  cellData: (d: Date, time: string) => SlotCell;
  selection: Selected[];
  onSelect: (d: Date, time: string, additive: boolean) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] select-none grid-cols-[56px_repeat(7,1fr)] gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] text-[0.74rem]">
        <div className="bg-[var(--page-bg)]" />
        {days.map((d) => {
          const closed = isClosedDay(d);
          return (
            <div key={d.toISOString()} className="bg-[var(--page-bg)] px-1 pt-1 text-center">
              <div className={`text-[0.58rem] leading-tight ${closed ? "text-[var(--ink-faint)]" : "text-[var(--ink-soft)]"}`}>
                {WEEKDAY_LABEL[d.getDay()]}
              </div>
              <div className={`font-[family-name:var(--font-mono-kr)] text-[0.78rem] leading-tight font-semibold ${closed ? "text-[var(--ink-faint)]" : ""}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}

        {ADMIN_TIMES.map((time) => (
          <Fragment key={time}>
            <div className="flex items-center justify-center bg-[var(--card-bg)] font-[family-name:var(--font-mono-kr)] text-[0.68rem] text-[var(--ink-soft)]">
              {time}
            </div>
            {days.map((d) => {
              const closed = isClosedDay(d);
              const cell = cellData(d, time);
              const status = closed ? "closed" : cell.status;
              const key = `${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}_${time}`;
              const isSelected = selection.some((s) => s.key === key);
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
                  onClick={(e) => status !== "closed" && onSelect(d, time, e.ctrlKey || e.metaKey || e.shiftKey)}
                  className={`min-h-[30px] px-1 py-1 text-[0.68rem] text-center leading-[1.15] ${stripe} ${
                    status === "booked"
                      ? "border border-[var(--success)] bg-[var(--success-soft)] font-bold text-[var(--success)]"
                      : ""
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
  );
}

function SlotDetail({
  selected,
  cell,
  pending,
  onCancel,
  onBlock,
  onReopen,
  onCreate,
}: {
  selected: Selected;
  cell: SlotCell;
  pending: boolean;
  onCancel: () => void;
  onBlock: () => void;
  onReopen: () => void;
  onCreate: (name: string, phone: string) => void;
}) {
  const when = `${selected.m + 1}월 ${selected.d}일(${WEEKDAY_LABEL[new Date(selected.y, selected.m, selected.d).getDay()]}) ${selected.time}`;

  if (cell.status === "booked") {
    return (
      <div>
        <Row label="환자" value={cell.patientName ?? "-"} />
        <Row label="연락처" value={cell.patientPhone ?? "-"} />
        <Row label="시술" value="Face Lift" />
        <Row label="일시" value={when} />
        <div className="flex justify-between border-b border-[var(--line)] py-1 text-[0.8rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="done" label="확정" />
        </div>
        <div className="mt-2">
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
        <div className="flex justify-between border-b border-[var(--line)] py-1 text-[0.8rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="pending" label="결제 대기중" />
        </div>
        <p className="mt-2.5 text-[0.72rem] text-[var(--ink-soft)]">
          결제창으로 이동했지만 아직 승인되지 않았습니다. 오래 방치된 경우 취소해서 슬롯을 다시 열 수 있어요.
        </p>
        <div className="mt-2">
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
        <div className="flex justify-between border-b border-[var(--line)] py-1 text-[0.8rem]">
          <span className="text-[var(--ink-soft)]">상태</span>
          <StatusPill status="cancel" label="관리자 차단" />
        </div>
        <div className="mt-2">
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
      <div className="flex justify-between border-b border-[var(--line)] py-1 text-[0.8rem]">
        <span className="text-[var(--ink-soft)]">상태</span>
        <StatusPill status="progress" label="예약 가능" />
      </div>
      <div className="mt-2">
        <button
          type="button"
          disabled={pending}
          onClick={onBlock}
          className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)] disabled:opacity-50"
        >
          슬롯 막기
        </button>
      </div>
      <ManualBookingForm key={selected.key} pending={pending} onCreate={onCreate} />
    </div>
  );
}

/** 전화 등으로 받은 예약을 관리자가 직접 입력해 확정한다. */
function ManualBookingForm({ pending, onCreate }: { pending: boolean; onCreate: (name: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const inputCls =
    "w-full rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-2 text-[0.8rem] outline-none focus:border-[var(--accent)]";

  return (
    <form
      className="mt-3 border-t border-[var(--line)] pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(name, phone);
      }}
    >
      <div className="mb-2 text-[0.8rem] font-bold">직접 예약 등록</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="환자 이름"
          autoComplete="off"
          className={inputCls}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호 (010-0000-0000)"
          autoComplete="off"
          className={inputCls}
        />
      </div>
      <p className="mt-1.5 text-[0.7rem] text-[var(--ink-soft)]">
        예약금 결제 없이 바로 확정됩니다. 알림톡은 발송되지 않아요.
      </p>
      <button
        type="submit"
        disabled={pending || !name.trim() || !phone.trim()}
        className="mt-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[0.8rem] font-bold text-white disabled:opacity-50"
      >
        예약 등록
      </button>
    </form>
  );
}

function BulkDetail({
  selection,
  cellData,
  pending,
  onBlock,
  onReopen,
  onClear,
}: {
  selection: Selected[];
  cellData: (d: Date, time: string) => SlotCell;
  pending: boolean;
  onBlock: (items: Selected[]) => void;
  onReopen: (items: Selected[]) => void;
  onClear: () => void;
}) {
  const sorted = [...selection].sort((a, b) => a.key.localeCompare(b.key));
  const openItems = sorted.filter((s) => cellData(new Date(s.y, s.m, s.d), s.time).status === "open");
  const blockedItems = sorted.filter((s) => cellData(new Date(s.y, s.m, s.d), s.time).status === "blocked");

  return (
    <div>
      <Row label="선택한 슬롯" value={`${sorted.length}개`} />
      <div className="flex flex-wrap gap-1 border-b border-[var(--line)] py-2">
        {sorted.map((s) => (
          <span
            key={s.key}
            className="rounded-full bg-[var(--page-bg)] px-2 py-0.5 text-[0.7rem] text-[var(--ink-soft)]"
          >
            {s.m + 1}/{s.d} {s.time}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {openItems.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onBlock(openItems)}
            className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)] disabled:opacity-50"
          >
            {openItems.length}개 슬롯 막기
          </button>
        )}
        {blockedItems.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onReopen(blockedItems)}
            className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)] disabled:opacity-50"
          >
            {blockedItems.length}개 슬롯 열기
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-[var(--line)] px-3.5 py-2 text-[0.8rem] text-[var(--ink-soft)]"
        >
          선택 해제
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--line)] py-1 text-[0.8rem]">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <b className="font-semibold">{value}</b>
    </div>
  );
}
