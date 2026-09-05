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

/** DB의 consultations.status 값을 화면 표시용 StatusKey/라벨로 변환 */
export type ConsultationDbStatus = "pending" | "needs_review" | "in_progress" | "reserved" | "cancelled";

const CONSULTATION_STATUS_META: Record<ConsultationDbStatus, { key: StatusKey; label: string }> = {
  pending: { key: "pending", label: "대기" },
  needs_review: { key: "review", label: "확인필요" },
  in_progress: { key: "progress", label: "응대중" },
  reserved: { key: "done", label: "예약완료" },
  cancelled: { key: "cancel", label: "취소" },
};

export function consultationStatusMeta(status: string) {
  return CONSULTATION_STATUS_META[status as ConsultationDbStatus] ?? { key: "pending" as StatusKey, label: status };
}
