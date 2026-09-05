import Link from "next/link";
import { cancelPendingReservation } from "@/lib/payments/toss";

const MESSAGE_BY_CODE: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제를 취소하셨습니다.",
  PAY_PROCESS_ABORTED: "결제 진행 중 문제가 발생했습니다.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했습니다.",
};

export default async function CheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}) {
  const { code, message, orderId } = await searchParams;

  if (orderId) {
    await cancelPendingReservation(orderId);
  }

  const shown = (code && MESSAGE_BY_CODE[code]) || message || "결제가 완료되지 않았습니다.";

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="flex justify-center px-5 py-14">
        <div className="w-full max-w-[440px] rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)] p-8 text-center shadow-[0_24px_60px_-32px_rgba(42,31,34,0.35)]">
          <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--danger-soft)] text-[1.4rem] text-[var(--danger)]">
            ✕
          </div>
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-[1.3rem] font-bold">예약이 완료되지 않았습니다</h1>
          <p className="mb-6 text-[0.86rem] leading-[1.6] text-[var(--ink-soft)]">{shown}</p>
          <p className="mb-6 text-[0.76rem] text-[var(--ink-soft)]">
            선점했던 시간은 다시 예약 가능한 상태로 풀렸어요. 원하시면 다시 시도해주세요.
          </p>
          <Link
            href="/consult/schedule"
            className="inline-block rounded-[10px] bg-[var(--accent)] px-6 py-3 text-[0.88rem] font-bold text-white"
          >
            다시 예약하기
          </Link>
        </div>
      </div>
    </div>
  );
}
