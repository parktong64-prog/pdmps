"use client";

import { useEffect, useState } from "react";
import { StatusPill, type StatusKey } from "@/lib/admin/status";
import { getPayments, refundPayment, type PaymentRow } from "@/lib/admin/actions";

const STATUS_META: Record<PaymentRow["status"], StatusKey> = {
  paid: "done",
  pending: "pending",
  failed: "cancel",
  refunded: "review",
  cancelled: "cancel",
};

const FILTERS: { key: string; label: string; match: PaymentRow["status"][] | null }[] = [
  { key: "all", label: "전체", match: null },
  { key: "paid", label: "결제완료", match: ["paid"] },
  { key: "pending", label: "대기", match: ["pending"] },
  { key: "failed", label: "실패", match: ["failed"] },
  { key: "refunded", label: "환불", match: ["refunded"] },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [revenue, setRevenue] = useState<{ d: string; v: number }[]>([]);
  const [filter, setFilter] = useState("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  function reload() {
    getPayments().then(({ rows, revenue }) => {
      setPayments(rows);
      setRevenue(revenue);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  if (payments === null) {
    return <div className="py-10 text-center text-[0.84rem] text-[var(--ink-soft)]">불러오는 중…</div>;
  }

  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const rows = activeFilter.match ? payments.filter((p) => activeFilter.match!.includes(p.status)) : payments;

  const thisMonthPaid = payments.filter((p) => p.status === "paid");
  const monthRevenue = thisMonthPaid.reduce((sum, p) => sum + p.amount, 0);
  const refundedSum = payments.filter((p) => p.status === "refunded").reduce((sum, p) => sum + p.amount, 0);
  const total = payments.length;
  const successRate = total > 0 ? Math.round((payments.filter((p) => p.status === "paid").length / total) * 1000) / 10 : 0;

  const tiles = [
    { lbl: "누적 매출", val: monthRevenue >= 1_000_000 ? `${(monthRevenue / 1_000_000).toFixed(1)}M` : `${monthRevenue.toLocaleString()}원` },
    { lbl: "결제건수", val: String(total) },
    { lbl: "환불액", val: refundedSum >= 1_000_000 ? `${(refundedSum / 1_000_000).toFixed(1)}M` : `${refundedSum.toLocaleString()}원` },
    { lbl: "결제 성공률", val: `${successRate}%` },
  ];

  const max = Math.max(1, ...revenue.map((r) => r.v));
  const baseY = 138;
  const topY = 14;
  const chartLeft = 40;
  const chartRight = 550;
  const gap = 14;
  const barW = (chartRight - chartLeft - gap * (revenue.length - 1)) / Math.max(1, revenue.length);

  async function handleRefund(id: string) {
    setPendingId(id);
    try {
      await refundPayment(id);
      reload();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">결제·매출 관리</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">전체 기간</div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.lbl} className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
            <div className="mb-2 text-[0.72rem] text-[var(--ink-soft)]">{t.lbl}</div>
            <div className="font-[family-name:var(--font-mono-kr)] text-[1.4rem] font-semibold tabular-nums">{t.val}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        <div className="mb-4 text-[0.82rem] font-bold">
          최근 7일 매출 추이<span className="ml-1.5 font-normal text-[0.76rem] text-[var(--ink-soft)]">단위: 원</span>
        </div>
        <svg viewBox="0 0 560 170" width="100%" role="img" aria-label="최근 7일 매출 막대그래프">
          <line x1={30} y1={baseY} x2={550} y2={baseY} style={{ stroke: "var(--line)", strokeWidth: 1 }} />
          {revenue.map((r, i) => {
            const x = chartLeft + i * (barW + gap);
            const h = Math.max(4, (r.v / max) * (baseY - topY));
            const y = baseY - h;
            const isMax = r.v === max && r.v > 0;
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

        {rows.length === 0 ? (
          <div className="py-7 text-center text-[0.82rem] text-[var(--ink-soft)]">해당 결제 내역이 없습니다.</div>
        ) : (
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
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--accent-soft)]">
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
                    <StatusPill status={STATUS_META[p.status]} label={p.statusLabel + (p.type === "예약금" && p.status === "paid" ? " (환불불가)" : "")} />
                  </td>
                  <td className="border-b border-[var(--line)] px-2.5 py-3">
                    {p.type === "예약금" ? (
                      <span className="text-[0.7rem] text-[var(--ink-faint)]">환불 불가</span>
                    ) : p.status === "paid" && p.refundable ? (
                      <button
                        type="button"
                        disabled={pendingId === p.id}
                        onClick={() => handleRefund(p.id)}
                        className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[0.76rem] font-bold text-[var(--accent-ink)] hover:brightness-95 disabled:opacity-50"
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
