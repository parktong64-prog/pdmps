import Link from "next/link";
import { confirmTossPayment } from "@/lib/payments/toss";
import { ENG, localePath, type Lang } from "@/lib/i18n/patient";

export default async function SuccessContent({
  searchParams,
  lang = "ko",
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
  lang?: Lang;
}) {
  const en = lang === "en";
  const E = ENG.success;
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) {
    return <ErrorCard message={en ? E.errInvalid : "결제 정보가 올바르지 않습니다."} lang={lang} />;
  }

  const result = await confirmTossPayment({ paymentKey, orderId, amount: Number(amount) });

  if (!result.ok) {
    return <ErrorCard message={result.error} lang={lang} />;
  }

  const { reservation } = result;

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="flex justify-center px-5 py-14">
        <div className="w-full max-w-[440px] rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)] p-8 shadow-[0_24px_60px_-32px_rgba(42,31,34,0.35)]">
          <div className="py-3 text-center">
            <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--success-soft)] text-[1.4rem] text-[var(--success)]">
              ✓
            </div>
            <h1 className="mb-2 font-[family-name:var(--font-display)] text-[1.5rem] font-bold">
              {en ? E.title : "예약이 확정되었습니다"}
            </h1>
            <p className="mb-[22px] text-[1rem] leading-[1.6] text-[var(--ink-soft)]">
              {en ? E.lead : "예약일에 방문하시면 박동만 원장님과 상담해요."}
            </p>

            <div className="mb-[18px] flex flex-col gap-1.5 rounded-[10px] border border-[var(--line)] p-4 text-left text-[0.98rem] text-[var(--ink-soft)]">
              <div>
                <b className="font-semibold text-[var(--ink)]">{en ? E.name : "이름"}</b> · {reservation.name}
              </div>
              <div>
                <b className="font-semibold text-[var(--ink)]">{en ? E.phone : "전화번호"}</b> · {reservation.phone}
              </div>
              <div>
                <b className="font-semibold text-[var(--ink)]">{en ? E.when : "일시"}</b> · {reservation.when} · Face Lift
              </div>
            </div>

            {en ? (
              <>
                {reservation.email && (
                  <div className="mb-2 text-left text-[0.9rem] text-[var(--ink-soft)]">
                    {E.emailNote} ({reservation.email})
                  </div>
                )}
                <div className="mb-[18px] text-left text-[0.84rem] text-[var(--ink-soft)]">{E.changeNote}</div>
              </>
            ) : (
              <>
            <div className="mb-2 flex items-center gap-1.5 text-[0.9rem] font-bold text-[var(--ink-soft)]">
              <span className="h-2 w-2 rounded-full bg-[#fee500] shadow-[0_0_0_1px_#d8c400_inset]" />
              카카오 알림톡 자동 발송
            </div>
            <div className="mb-1.5 rounded-[4px_14px_14px_14px] bg-[#fee500] px-3.5 py-3 text-left text-[0.94rem] leading-[1.6] text-[#3c1e1e]">
              [PDM박동만성형외과] {reservation.when} 상담 예약이 확정되었습니다.
            </div>
            <div className="mb-2 text-left text-[0.84rem] text-[var(--ink-soft)]">
              알림톡 발송 실패 시 문자(SMS)로 자동 재발송됩니다.
            </div>
            <div className="mb-[18px] text-left text-[0.84rem] text-[var(--ink-soft)]">
              병원 사정에 따라 예약 일정이 변경될 수 있으며, 변경 시 별도로 연락드립니다.
            </div>

              </>
            )}

            <Link href={localePath(lang, "/consult/schedule")} className="text-[0.98rem] text-[var(--accent-ink)] underline underline-offset-2">
              {en ? E.another : "다른 예약 남기기"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message, lang }: { message: string; lang: Lang }) {
  const en = lang === "en";
  const E = ENG.success;
  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="flex justify-center px-5 py-14">
        <div className="w-full max-w-[440px] rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)] p-8 text-center shadow-[0_24px_60px_-32px_rgba(42,31,34,0.35)]">
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-[1.3rem] font-bold">{en ? E.errTitle : "결제 확인에 실패했습니다"}</h1>
          <p className="mb-6 text-[1rem] leading-[1.6] text-[var(--ink-soft)]">{message}</p>
          <Link
            href={localePath(lang, "/consult/schedule")}
            className="inline-block rounded-[10px] bg-[var(--accent)] px-6 py-3 text-[1rem] font-bold text-white"
          >
            {en ? E.errRetry : "다시 예약하기"}
          </Link>
        </div>
      </div>
    </div>
  );
}
