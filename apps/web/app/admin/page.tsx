import Link from "next/link";
import { StatusPill } from "@/lib/admin/status";

const TILES = [
  { lbl: "오늘 신규 상담", val: "7", delta: "▲ 2 어제 대비", tone: "up" as const },
  { lbl: "오늘 예약", val: "4", delta: "— 어제와 동일", tone: "flat" as const },
  { lbl: "AI 확인 필요", val: "2", delta: "전화 확인 대기중", tone: "down" as const, flag: true },
  { lbl: "이번주 노쇼율", val: "4.2%", delta: "▼ 0.8p 개선", tone: "up" as const },
  { lbl: "이번달 매출", val: "27.8M", delta: "▲ 12%", tone: "up" as const },
];

const RECENT = [
  { who: "이은지", meta: "웹 · 09.05 14:02", status: "review" as const, label: "확인필요" },
  { who: "박서연", meta: "앱 · 09.05 11:30", status: "progress" as const, label: "응대중" },
  { who: "최유리", meta: "웹 · 09.04 20:11", status: "done" as const, label: "예약완료" },
  { who: "한소민", meta: "앱 · 09.04 09:47", status: "pending" as const, label: "대기" },
];

const WEEK = [
  { d: "월", n: 3, busy: false },
  { d: "화", n: 7, busy: true },
  { d: "수", n: 4, busy: false },
  { d: "목", n: 6, busy: true },
  { d: "금", n: 5, busy: false },
  { d: "토", n: 4, busy: true },
  { d: "일", n: null, busy: false },
];

const deltaColor = { up: "text-[var(--st-done)]", down: "text-[var(--danger)]", flat: "text-[var(--ink-soft)]" };

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">대시보드 홈</h1>
        <div className="font-[family-name:var(--font-mono-kr)] text-[0.8rem] text-[var(--ink-soft)]">
          2026.09.05 (토)
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {TILES.map((t) => (
          <div key={t.lbl} className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
            <div className="mb-2 text-[0.72rem] text-[var(--ink-soft)]">{t.lbl}</div>
            <div
              className={`font-[family-name:var(--font-mono-kr)] text-[1.4rem] font-semibold tabular-nums ${
                t.flag ? "text-[var(--st-review)]" : ""
              }`}
            >
              {t.val}
            </div>
            <div className={`mt-1.5 text-[0.68rem] ${deltaColor[t.tone]}`}>{t.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          <div className="mb-3.5 flex items-center justify-between text-[0.82rem] font-bold">
            <span>최근 상담 신청</span>
            <Link href="/admin/consultations" className="text-[0.72rem] font-medium text-[var(--accent-ink)]">
              전체 보기 ›
            </Link>
          </div>
          {RECENT.map((r, i) => (
            <div
              key={r.who}
              className={`flex items-center justify-between py-2.5 text-[0.82rem] ${
                i < RECENT.length - 1 ? "border-b border-[var(--line)]" : ""
              }`}
            >
              <div>
                <div className="font-semibold">{r.who}</div>
                <div className="mt-0.5 text-[0.7rem] text-[var(--ink-soft)]">{r.meta}</div>
              </div>
              <StatusPill status={r.status} label={r.label} />
            </div>
          ))}
        </div>

        <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          <div className="mb-3.5 text-[0.82rem] font-bold">이번 주 예약 현황</div>
          <div className="mb-2 flex justify-between text-[0.68rem] text-[var(--ink-soft)]">
            {WEEK.map((w) => (
              <span key={w.d}>{w.d}</span>
            ))}
          </div>
          <div className="flex justify-between">
            {WEEK.map((w) => (
              <div
                key={w.d}
                className={`flex h-7 w-7 items-center justify-center rounded-full font-[family-name:var(--font-mono-kr)] text-[0.7rem] ${
                  w.n === null
                    ? "opacity-35"
                    : w.busy
                      ? "bg-[var(--accent)] font-semibold text-white"
                      : "bg-[var(--page-bg)] text-[var(--ink-soft)]"
                }`}
              >
                {w.n === null ? "휴" : w.n}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
