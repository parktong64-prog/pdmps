"use client";

import { useState } from "react";
import { StatusPill, type StatusKey } from "@/lib/admin/status";

const TILES = [
  { lbl: "이번달 매출", val: "27.8M", delta: "▲ 12%", tone: "up" as const },
  { lbl: "이번달 결제건수", val: "42", delta: "▲ 5건", tone: "up" as const },
  { lbl: "환불액", val: "27.5M", delta: "시술비 환불 1건", tone: "flat" as const },
  { lbl: "결제 성공률", val: "97.6%", delta: "▲ 0.4p", tone: "up" as const },
];
const deltaColor = { up: "text-[var(--st-done)]", down: "text-[var(--danger)]", flat: "text-[var(--ink-soft)]" };

const REVENUE = [
  { d: "8/30", v: 1250000 },
  { d: "8/31", v: 2600000 },
  { d: "9/1", v: 1800000 },
  { d: "9/2", v: 4250000 },
  { d: "9/3", v: 900000 },
  { d: "9/4", v: 3200000 },
  { d: "9/5", v: 2100000 },
];

type PayStatus = "pending" | "paid" | "paid_noref" | "failed" | "refunded";
type PaymentRow = {
  patient: string;
  type: "예약금" | "시술비";
  amount: number;
  method: string;
  date: string;
  status: PayStatus;
  refundable: boolean;
};

const INITIAL_PAYMENTS: PaymentRow[] = [
  { patient: "이은지", type: "예약금", amount: 50000, method: "-", date: "09.05", status: "pending", refundable: false },
  { patient: "박서연", type: "예약금", amount: 50000, method: "카카오페이", date: "09.04", status: "paid", refundable: false },
  { patient: "최유리", type: "예약금", amount: 50000, method: "카드", date: "09.04", status: "paid", refundable: false },
  { patient: "최유리", type: "시술비", amount: 27500000, method: "카드", date: "09.02", status: "paid", refundable: true },
  { patient: "한소민", type: "예약금", amount: 50000, method: "-", date: "09.04", status: "pending", refundable: false },
  { patient: "오지훈", type: "예약금", amount: 50000, method: "카카오페이", date: "09.03", status: "paid", refundable: false },
  { patient: "배수아", type: "예약금", amount: 50000, method: "-", date: "09.03", status: "pending", refundable: false },
  { patient: "문태현", type: "예약금", amount: 50000, method: "카드", date: "09.03", status: "failed", refundable: false },
  { patient: "강하은", type: "예약금", amount: 50000, method: "카드", date: "08.29", status: "paid_noref", refundable: false },
  { patient: "김도윤", type: "예약금", amount: 50000, method: "카드", date: "08.15", status: "paid", refundable: false },
  { patient: "김도윤", type: "시술비", amount: 27500000, method: "카드", date: "08.20", status: "refunded", refundable: false },
];

const STATUS_META: Record<PayStatus, { label: string; key: StatusKey }> = {
  paid: { label: "결제완료", key: "done" },
  paid_noref: { label: "결제완료", key: "done" },
  pending: { label: "대기", key: "pending" },
  failed: { label: "실패", key: "cancel" },
  refunded: { label: "환불", key: "review" },
};

const FILTERS: { key: string; label: string; match: PayStatus[] | null }[] = [
  { key: "all", label: "전체", match: null },
  { key: "paid", label: "결제완료", match: ["paid", "paid_noref"] },
  { key: "pending", label: "대기", match: ["pending"] },
  { key: "failed", label: "실패", match: ["failed"] },
  { key: "refunded", label: "환불", match: ["refunded"] },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState(INITIAL_PAYMENTS);
  const [filter, setFilter] = useState("all");

  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const rows = activeFilter.match ? payments.filter((p) => activeFilter.match!.includes(p.status)) : payments;

  const max = Math.max(...REVENUE.map((r) => r.v));
  const baseY = 138;
  const topY = 14;
  const chartLeft = 40;
  const chartRight = 550;
  const gap = 14;
  const barW = (chartRight - chartLeft - gap * (REVENUE.length - 1)) / REVENUE.length;

  function handleRefund(idx: number) {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, status: "refunded", refundable: false } : p)));
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">결제·매출 관리</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">2026년 9월</div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.lbl} className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
            <div className="mb-2 text-[0.72rem] text-[var(--ink-soft)]">{t.lbl}</div>
            <div className="font-[family-name:var(--font-mono-kr)] text-[1.4rem] font-semibold tabular-nums">{t.val}</div>
            <div className={`mt-1.5 text-[0.68rem] ${deltaColor[t.tone]}`}>{t.delta}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        <div className="mb-4 text-[0.82rem] font-bold">
          최근 7일 매출 추이<span className="ml-1.5 font-normal text-[0.76rem] text-[var(--ink-soft)]">단위: 원</span>
        </div>
        <svg viewBox="0 0 560 170" width="100%" role="img" aria-label="최근 7일 매출 막대그래프">
          <line x1={30} y1={baseY} x2={550} y2={baseY} style={{ stroke: "var(--line)", strokeWidth: 1 }} />
          {REVENUE.map((r, i) => {
            const x = chartLeft + i * (barW + gap);
            const h = Math.max(4, (r.v / max) * (baseY - topY));
            const y = baseY - h;
            const isMax = r.v === max;
            return (
              <g key={r.d}>
                <rect x={x} y={y} width={barW} height={h} rx={4} style={{ fill: "var(--accent)" }}>
                  <title>
                    {r.d} · {r.v.toLocaleString()}원
                  </title>
                </rect>
                {isMax && (
                  <text
                    x={x + barW / 2}
                    y={y - 6}
                    textAnchor="middle"
                    style={{ fontFamily: "var(--font-mono-kr)", fontSize: 10, fontWeight: 600, fill: "var(--ink)" }}
                  >
                    {(r.v / 10000).toLocaleString()}만
                  </text>
                )}
                <text
                  x={x + barW / 2}
                  y={152}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono-kr)", fontSize: 9, fill: "var(--ink-soft)" }}
                >
                  {r.d}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3.5 py-1.5 font-[family-name:var(--font-mono-kr)] text-[0.78rem] transition-colors ${
                filter === f.key
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-[var(--card-bg)] text-[var(--ink-soft)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <table className="w-full min-w-[560px] border-collapse text-[0.82rem]">
          <thead>
            <tr>
              {["환자", "종류", "금액", "결제수단", "결제일", "상태", "액션"].map((h) => (
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
            {rows.map((p) => {
              const idx = payments.indexOf(p);
              const meta = STATUS_META[p.status];
              return (
                <tr key={idx} className="hover:bg-[var(--accent-soft)]">
                  <td className="border-b border-[var(--line)] px-2.5 py-3 font-semibold">{p.patient}</td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">
                    <span className="rounded-full border border-[var(--line)] bg-[var(--page-bg)] px-2 py-0.5 text-[0.68rem] text-[var(--ink-soft)]">
                      {p.type}
                    </span>
                  </td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3 font-[family-name:var(--font-mono-kr)] font-semibold tabular-nums">
                    {p.amount.toLocaleString()}원
                  </td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">{p.method}</td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">{p.date}</td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">
                    <StatusPill status={meta.key} label={meta.label + (p.status === "paid_noref" ? " (환불불가)" : "")} />
                  </td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">
                    {p.type === "예약금" ? (
                      <span className="text-[0.7rem] text-[var(--ink-faint)]">환불 불가</span>
                    ) : p.status === "paid" && p.refundable ? (
                      <button
                        type="button"
                        onClick={() => handleRefund(idx)}
                        className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[0.76rem] font-bold text-[var(--accent-ink)] hover:brightness-95"
                      >
                        환불 처리
                      </button>
                    ) : p.status === "refunded" ? (
                      <span className="text-[0.7rem] text-[var(--ink-faint)]">환불 완료</span>
                    ) : (
                      <span className="text-[0.7rem] text-[var(--ink-faint)]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
