"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusPill, type StatusKey } from "@/lib/admin/status";
import { getConsultations, restoreConsultation, type ConsultationRow } from "@/lib/admin/actions";

const FILTERS: { key: StatusKey | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "대기" },
  { key: "progress", label: "응대중" },
  { key: "review", label: "확인필요" },
  { key: "done", label: "예약완료" },
  { key: "cancel", label: "취소" },
];

export default function ConsultationsPage() {
  const [rowsAll, setRowsAll] = useState<ConsultationRow[] | null>(null);
  const [filter, setFilter] = useState<StatusKey | "all">("all");
  const [showArchived, setShowArchived] = useState(false);

  const reload = useCallback(() => {
    getConsultations({ includeArchived: showArchived }).then(setRowsAll);
  }, [showArchived]);

  useEffect(() => {
    setRowsAll(null);
    reload();
  }, [reload]);

  async function handleRestore(id: string) {
    await restoreConsultation(id);
    reload();
  }

  if (rowsAll === null) {
    return <div className="py-10 text-center text-[0.84rem] text-[var(--ink-soft)]">불러오는 중…</div>;
  }

  const rows = filter === "all" ? rowsAll : rowsAll.filter((r) => r.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">상담 관리</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold transition-colors ${
              showArchived
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] text-[var(--ink-soft)]"
            }`}
          >
            {showArchived ? "보관함 보는 중" : "보관함 보기"}
          </button>
          <div className="text-[0.8rem] text-[var(--ink-soft)]">전체 {rowsAll.length}건</div>
        </div>
      </div>

      {showArchived && (
        <div className="mb-3 rounded-[10px] bg-[var(--accent-soft)] px-3.5 py-2.5 text-[0.76rem] text-[var(--accent-ink)]">
          예약일이 7일 넘게 지나 자동으로 보관된 상담입니다. 이력은 그대로 남아 있고, 복원하면 다시 기본 목록에 보입니다.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? rowsAll.length : rowsAll.filter((r) => r.status === f.key).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3.5 py-1.5 font-[family-name:var(--font-mono-kr)] text-[0.78rem] transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-[var(--card-bg)] text-[var(--ink-soft)]"
              }`}
            >
              {f.label} {count}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        {rows.length === 0 ? (
          <div className="py-7 text-center text-[0.82rem] text-[var(--ink-soft)]">
            해당 상태의 상담이 없습니다.
          </div>
        ) : (
          <table className="w-full min-w-[480px] border-collapse text-[0.82rem]">
            <thead>
              <tr>
                {[...["환자", "채널", "상태", "신청일"], ...(showArchived ? ["보관"] : [])].map((h) => (
                  <th
                    key={h}
                    className="border-b border-[var(--line)] px-2.5 pb-2.5 text-left text-[0.7rem] font-semibold tracking-[0.03em] text-[var(--ink-soft)] uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--accent-soft)]">
                  <td className="border-b border-[var(--line)] px-2.5 py-3 font-semibold">
                    {r.name}
                    {r.flagged && (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--st-review-soft)] px-1.5 py-0.5 text-[0.64rem] font-bold text-[var(--st-review)]">
                        AI 확인
                      </span>
                    )}
                  </td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">{r.channel}</td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">
                    <StatusPill status={r.status} label={r.statusLabel} />
                  </td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">{r.date}</td>
                  {showArchived && (
                    <td className="border-b border-[var(--line)] px-2.5 py-3">
                      <button
                        type="button"
                        onClick={() => handleRestore(r.id)}
                        className="rounded-md border border-[var(--line)] px-2.5 py-1 text-[0.72rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)]"
                      >
                        복원
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
