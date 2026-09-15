import { getFunnelStats } from "@/lib/admin/actions";

// 실시간 집계이므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

function todayKST() {
  // 서버가 UTC로 돌아도 화면 기본값은 KST 기준 오늘 날짜로 맞춘다.
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function daysAgoKST(n: number) {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000 - n * 24 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const to = params.to || todayKST();
  const from = params.from || daysAgoKST(6);

  const stages = await getFunnelStats(from, to);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">통계</h1>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
        <div>
          <label className="mb-1 block text-[0.72rem] font-semibold text-[var(--ink-soft)]">시작일</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            max={to}
            className="rounded-lg border border-[var(--line)] bg-[var(--card-bg)] px-3 py-2 text-[0.82rem] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.72rem] font-semibold text-[var(--ink-soft)]">종료일</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            max={todayKST()}
            className="rounded-lg border border-[var(--line)] bg-[var(--card-bg)] px-3 py-2 text-[0.82rem] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[0.82rem] font-bold text-white hover:brightness-[1.06]"
        >
          조회
        </button>
      </form>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        <div className="mb-1 text-[0.82rem] font-bold">단계별 방문자 퍼널</div>
        <p className="mb-5 text-[0.72rem] text-[var(--ink-soft)]">
          {from} ~ {to} · 각 단계에 표시된 인원(익명 방문자 수 기준)과, 맨 위 &quot;홈 화면 방문&quot; 대비 비율입니다.
        </p>

        <div className="flex flex-col gap-3">
          {stages.map((s) => (
            <div key={s.key}>
              <div className="mb-1 flex items-center justify-between text-[0.8rem]">
                <span className="font-semibold">{s.label}</span>
                <span className="font-[family-name:var(--font-mono-kr)] text-[var(--ink-soft)]">
                  {s.count.toLocaleString()}명 · {s.pct}%
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full bg-[var(--page-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                  style={{ width: `${Math.max((s.count / maxCount) * 100, s.count > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {stages[0].count === 0 && (
          <p className="mt-5 text-[0.76rem] text-[var(--ink-soft)]">
            이 기간에 집계된 방문이 없습니다. (방문 추적은 오늘부터 새로 시작되어, 이전 기간에는 데이터가 없을 수 있습니다.)
          </p>
        )}
      </div>
    </div>
  );
}
