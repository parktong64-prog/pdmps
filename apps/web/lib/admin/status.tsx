export type StatusKey = "pending" | "progress" | "review" | "done" | "cancel";

const META: Record<StatusKey, { bg: string; fg: string }> = {
  pending: { bg: "var(--st-pending-soft)", fg: "var(--st-pending)" },
  progress: { bg: "var(--st-progress-soft)", fg: "var(--st-progress)" },
  review: { bg: "var(--st-review-soft)", fg: "var(--st-review)" },
  done: { bg: "var(--st-done-soft)", fg: "var(--st-done)" },
  cancel: { bg: "var(--st-cancel-soft)", fg: "var(--st-cancel)" },
};

/** 상담/예약/결제 상태를 색이 있는 pill로 표시. 상태 색상은 accent와 분리된 시맨틱 색상. */
export function StatusPill({ status, label }: { status: StatusKey; label: string }) {
  const { bg, fg } = META[status];
  return (
    <span
      style={{ background: bg, color: fg }}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: fg }} />
      {label}
    </span>
  );
}
