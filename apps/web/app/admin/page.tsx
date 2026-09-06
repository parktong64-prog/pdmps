import Link from "next/link";
import { StatusPill } from "@/lib/admin/status";
import { getDashboardData } from "@/lib/admin/actions";

const deltaColor = { up: "text-[var(--st-done)]", down: "text-[var(--danger)]", flat: "text-[var(--ink-soft)]" };

// 실시간 통계 화면이므로 정적 캐싱을 끈다 (요청마다 최신 데이터 조회).
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(now);

  const tiles = [
    { lbl: "오늘 신규 상담", val: String(data.todayNewConsultations), delta: "실시간 집계", tone: "flat" as const },
    { lbl: "오늘 예약", val: String(data.todayReservations), delta: "실시간 집계", tone: "flat" as const },
    {
      lbl: "AI 확인 필요",
      val: String(data.needsReviewCount),
      delta: data.needsReviewCount > 0 ? "확인 대기중" : "확인할 항목 없음",
      tone: data.needsReviewCount > 0 ? ("down" as const) : ("flat" as const),
      flag: data.needsReviewCount > 0,
    },
    { lbl: "이번주 노쇼율", val: `${data.noShowRate}%`, delta: "이번 주 확정 예약 기준", tone: "flat" as const },
    { lbl: "이번달 매출", val: data.monthRevenueLabel, delta: "예약금 결제 합계", tone: "flat" as const },
  ];

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">대시보드 홈</h1>
        <div className="font-[family-name:var(--font-mono-kr)] text-[0.8rem] text-[var(--ink-soft)]">{todayLabel}</div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
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
          {data.recent.length === 0 ? (
            <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">아직 접수된 상담이 없습니다.</div>
          ) : (
            data.recent.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center justify-between py-2.5 text-[0.82rem] ${
                  i < data.recent.length - 1 ? "border-b border-[var(--line)]" : ""
                }`}
              >
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="mt-0.5 text-[0.7rem] text-[var(--ink-soft)]">{r.meta}</div>
                </div>
                <StatusPill status={r.status} label={r.label} />
              </div>
            ))
          )}
        </div>

        <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          <div className="mb-3.5 text-[0.82rem] font-bold">이번 주 예약 현황</div>
          <div className="mb-2 flex justify-between text-[0.68rem] text-[var(--ink-soft)]">
            {data.week.map((w) => (
              <span key={w.d}>{w.d}</span>
            ))}
          </div>
          <div className="flex justify-between">
            {data.week.map((w) => (
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
