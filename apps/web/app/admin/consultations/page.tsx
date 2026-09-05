"use client";

import { useState } from "react";
import { StatusPill, type StatusKey } from "@/lib/admin/status";

type Row = { name: string; channel: string; status: StatusKey; staff: string; date: string; flagged: boolean };

const ROWS: Row[] = [
  { name: "이은지", channel: "웹", status: "review", staff: "미배정", date: "09.05", flagged: true },
  { name: "박서연", channel: "앱", status: "progress", staff: "김민지", date: "09.05", flagged: false },
  { name: "최유리", channel: "웹", status: "done", staff: "정하늘", date: "09.04", flagged: false },
  { name: "한소민", channel: "앱", status: "pending", staff: "미배정", date: "09.04", flagged: false },
  { name: "오지훈", channel: "웹", status: "review", staff: "미배정", date: "09.04", flagged: true },
  { name: "배수아", channel: "앱", status: "progress", staff: "정하늘", date: "09.03", flagged: false },
  { name: "문태현", channel: "웹", status: "pending", staff: "미배정", date: "09.03", flagged: false },
  { name: "강하은", channel: "앱", status: "cancel", staff: "김민지", date: "08.30", flagged: false },
];

const STATUS_LABEL: Record<StatusKey, string> = {
  pending: "대기",
  progress: "응대중",
  review: "확인필요",
  done: "예약완료",
  cancel: "취소",
};

const FILTERS: { key: StatusKey | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "대기" },
  { key: "progress", label: "응대중" },
  { key: "review", label: "확인필요" },
  { key: "done", label: "예약완료" },
  { key: "cancel", label: "취소" },
];

export default function ConsultationsPage() {
  const [filter, setFilter] = useState<StatusKey | "all">("all");
  const rows = filter === "all" ? ROWS : ROWS.filter((r) => r.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">상담 관리</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">전체 32건</div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? ROWS.length : ROWS.filter((r) => r.status === f.key).length;
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
                {["환자", "채널", "상태", "담당", "신청일"].map((h) => (
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
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--accent-soft)]">
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
                    <StatusPill status={r.status} label={STATUS_LABEL[r.status]} />
                  </td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">{r.staff}</td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
