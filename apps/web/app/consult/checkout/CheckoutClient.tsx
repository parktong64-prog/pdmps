"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { ENG, SITE_EN, EN_DEPOSIT_USD, EN_HELP_EMAIL, type Lang } from "@/lib/i18n/patient";

type FieldErrors = { name?: string; email?: string; phone?: string; consent?: string };
type Step = "form" | "payment";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length > 7) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

/** 영어 결제 오류 아래에 문의 이메일을 안내한다. */
function PayHelp({ text }: { text: string }) {
  return (
    <div className="mt-2 text-[var(--ink)]">
      {text}{" "}
      <a href={`mailto:${EN_HELP_EMAIL}`} className="font-bold underline underline-offset-2">
        {EN_HELP_EMAIL}
      </a>
    </div>
  );
}

function CheckoutForm({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const E = ENG.checkout;
  const searchParams = useSearchParams();
  const scheduleLabel = searchParams.get("when") || "9월 18일(금) 14:30";
  const date = searchParams.get("date");
  const time = searchParams.get("time");

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = en ? E.errName : "이름을 입력해주세요.";
    if (en) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = E.errEmail;
      // 해외 번호: 국가번호 포함 숫자 8~15자리 (+, 공백, 하이픈, 괄호 허용)
      const digits = phone.replace(/\D/g, "");
      if (!/^\+?[\d\s\-()]{7,20}$/.test(phone.trim()) || digits.length < 8 || digits.length > 15) {
        next.phone = E.errPhone;
      }
    } else if (!/^01[016789]-\d{3,4}-\d{4}$/.test(phone.trim())) {
      next.phone = "010-1234-5678 형식으로 입력해주세요.";
    }
    if (!consent) next.consent = en ? E.errConsent : "개인정보 수집·이용에 동의해주세요.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setStep("payment");
  }

  async function handlePay() {
    setPaying(true);
    setSubmitError(null);
    try {
      // 1) 슬롯을 잠깐 선점(pending_payment)하고 주문 정보를 받는다
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), date, time, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || (en ? E.errBooking : "예약 처리 중 문제가 발생했습니다."));

      // 2) 토스페이먼츠 결제창으로 이동 (성공/실패 후 콜백 URL로 자동 리다이렉트됨)
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) throw new Error(en ? E.errPayConfig : "결제 설정이 올바르지 않습니다.");
      const tossPayments = await loadTossPayments(clientKey);
      const origin = window.location.origin;
      if (en) {
        // 해외 환자: 달러(USD) 예약금을 토스페이먼츠 해외간편결제(PayPal)로 결제한다.
        await tossPayments.requestPayment("해외간편결제", {
          provider: "PAYPAL",
          currency: "USD",
          country: "KR",
          amount: data.amount,
          orderId: data.orderId,
          orderName: data.orderName,
          customerName: data.customerName,
          successUrl: `${origin}/en/consult/checkout/success`,
          failUrl: `${origin}/en/consult/checkout/fail`,
        } as unknown as Parameters<typeof tossPayments.requestPayment>[1]);
      } else {
        await tossPayments.requestPayment("카드", {
          amount: data.amount,
          orderId: data.orderId,
          orderName: data.orderName,
          customerName: data.customerName,
          successUrl: `${origin}/consult/checkout/success`,
          failUrl: `${origin}/consult/checkout/fail`,
        });
      }
      // requestPayment는 성공 시 브라우저를 successUrl로 이동시키므로 이 아래는 보통 실행되지 않음
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : en
            ? E.errPayGeneric
            : "결제 진행 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      setPaying(false);
    }
  }

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="flex justify-center px-5 pt-3 pb-14">
        <div className="w-full max-w-[440px] rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)] p-8 shadow-[0_24px_60px_-32px_rgba(42,31,34,0.35)]">
          {step === "form" && (
            <>
              <div className="mb-2.5 text-xs font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
                {en ? SITE_EN.eyebrow : "Face Lift 전문 · 박동만 원장"}
              </div>
              <h1 className="mb-2 font-[family-name:var(--font-display)] text-[1.5rem] font-bold">
                {en ? E.formTitle : "예약자 정보를 입력해주세요"}
              </h1>
              <p className="mb-7 text-[0.86rem] leading-[1.6] text-[var(--ink-soft)]">
                {en ? E.formLead : "예약금 결제를 진행하기 위해 예약자 정보를 확인합니다."}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="f-name" className="text-[0.96rem] font-bold">
                    {en ? E.name : "이름"}<span className="ml-0.5 text-[var(--accent)]">*</span>
                  </label>
                  <input
                    id="f-name"
                    type="text"
                    placeholder={en ? E.namePh : "홍길동"}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={!!errors.name}
                    className={`rounded-[9px] border px-[13px] py-[11px] text-[1.1rem] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--focus-ring)] ${
                      errors.name ? "border-[var(--danger)]" : "border-[var(--line)]"
                    }`}
                  />
                  <div className="flex items-center gap-1.5 text-[0.74rem] text-[var(--danger)] empty:hidden">
                    {errors.name}
                  </div>
                </div>

                {en && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="f-email" className="text-[0.96rem] font-bold">
                      {E.email}
                      <span className="ml-0.5 text-[var(--accent)]">*</span>
                    </label>
                    <input
                      id="f-email"
                      type="email"
                      placeholder={E.emailPh}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!errors.email}
                      className={`rounded-[9px] border px-[13px] py-[11px] text-[1.1rem] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--focus-ring)] ${
                        errors.email ? "border-[var(--danger)]" : "border-[var(--line)]"
                      }`}
                    />
                    <div className="flex items-center gap-1.5 text-[0.74rem] text-[var(--danger)] empty:hidden">
                      {errors.email}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="f-phone" className="text-[0.96rem] font-bold">
                    {en ? E.phone : "전화번호"}<span className="ml-0.5 text-[var(--accent)]">*</span>
                  </label>
                  <input
                    id="f-phone"
                    type="tel"
                    inputMode={en ? "tel" : "numeric"}
                    placeholder={en ? E.phonePh : "010-1234-5678"}
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(en ? e.target.value : formatPhone(e.target.value))}
                    aria-invalid={!!errors.phone}
                    className={`rounded-[9px] border px-[13px] py-[11px] text-[1.1rem] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--focus-ring)] ${
                      errors.phone ? "border-[var(--danger)]" : "border-[var(--line)]"
                    }`}
                  />
                  <div className="flex items-center gap-1.5 text-[0.74rem] text-[var(--danger)] empty:hidden">
                    {errors.phone}
                  </div>
                </div>

                <label className="flex items-start gap-3 pt-0.5 text-[0.92rem] leading-[1.55] font-semibold text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-[2px] h-6 w-6 flex-none accent-[var(--accent)]"
                  />
                  <span>
                    {en ? (
                      <>
                        <b className="font-bold text-[var(--ink)]">{E.consentLead}</b> {E.consentRest}{" "}
                      </>
                    ) : (
                      <>
                        <b className="font-bold text-[var(--ink)]">개인정보 수집·이용에 동의합니다.</b> 입력하신
                        정보는 예약·결제 확인 및 안내 목적으로만 사용되며, 관련 법령에 따른 기간 동안 보관 후
                        파기됩니다.{" "}
                      </>
                    )}
                    <Link href="/privacy" target="_blank" className="underline underline-offset-2">
                      {en ? E.privacy : "개인정보처리방침"}
                    </Link>
                    {" · "}
                    <Link href="/terms" target="_blank" className="underline underline-offset-2">
                      {en ? E.terms : "이용약관"}
                    </Link>
                  </span>
                </label>
                {errors.consent && (
                  <div className="text-[0.86rem] font-semibold text-[var(--danger)]">{errors.consent}</div>
                )}

                {submitError && (
                  <div className="rounded-[10px] bg-[var(--danger-soft)] px-3 py-2.5 text-[0.78rem] leading-[1.55] text-[var(--danger)]">
                    {submitError}
                    <PayHelp text={en ? E.payHelp : "결제가 계속 되지 않으면 성함, 연락처, 희망 일시를 이메일로 보내주세요. 예약을 도와드릴게요."} />
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-1 rounded-[10px] bg-[var(--accent)] py-[16px] text-[1.1rem] font-bold text-white transition-[filter,transform] hover:brightness-[1.06] active:scale-[0.99]"
                >
                  {en ? E.nextPay : "다음 · 예약금 결제"}
                </button>
              </form>
            </>
          )}

          {step === "payment" && (
            <>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="mb-4 text-[1rem] font-bold text-[var(--ink-soft)] underline underline-offset-2"
              >
                {en ? E.backToEdit : "‹ 예약자 정보 다시 입력"}
              </button>
              <div className="mb-2.5 text-xs font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
                {en ? E.payEyebrow : "예약금 결제"}
              </div>
              <h1 className="mb-2 whitespace-nowrap font-[family-name:var(--font-display)] text-[clamp(0.95rem,calc((100vw_-_110px)/14),1.5rem)] tracking-tight font-bold">
                {en ? E.payTitle : "예약 내용을 확인해주세요"}
              </h1>
              <p className="mb-2.5 text-[1.24rem] leading-[1.5] font-semibold text-[var(--ink-soft)]">
                {en ? E.payLead : "결제가 완료되면 예약이 바로 확정됩니다."}
              </p>

              <div className="rounded-xl border border-[var(--line)] p-4">
                <div className="flex justify-between py-1.5 text-[1.2rem] text-[var(--ink-soft)]">
                  <span>{en ? E.rowProcedure : "시술"}</span>
                  <b className="font-semibold text-[var(--ink)]">Face Lift</b>
                </div>
                <div className="flex justify-between py-1.5 text-[1.2rem] text-[var(--ink-soft)]">
                  <span>{en ? E.rowDoctor : "담당"}</span>
                  <b className="font-semibold text-[var(--ink)]">{en ? ENG.schedule.doctor : "박동만 원장"}</b>
                </div>
                <div className="flex justify-between gap-2 whitespace-nowrap py-1.5 text-[clamp(0.9rem,calc((100vw_-_150px)/12),1.32rem)] text-[var(--ink-soft)]">
                  <span>{en ? E.rowWhen : "일시"}</span>
                  <b className="font-semibold text-[var(--ink)]">{scheduleLabel}</b>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between border-t border-dashed border-[var(--line)] pt-3">
                  <span className="text-[0.84rem] text-[var(--ink-soft)]">{en ? E.rowDeposit : "예약금"}</span>
                  <span className="text-[1.2rem] font-bold">{en ? `$${EN_DEPOSIT_USD} USD` : "50,000원"}</span>
                </div>
                <div className="mt-3 rounded-[9px] bg-[var(--danger-soft)] px-3 py-2.5 text-[0.74rem] leading-[1.55] text-[var(--danger)]">
                  {en ? E.depositNote : "예약금은 취소·변경·노쇼 등 사유와 관계없이 환불되지 않습니다."}{" "}
                  <Link href="/refund" target="_blank" className="underline underline-offset-2">
                    {en ? E.refundLink : "환불 규정 보기"}
                  </Link>
                </div>
              </div>

              {submitError && (
                <div className="mt-3.5 rounded-[10px] bg-[var(--danger-soft)] px-3 py-2.5 text-[0.78rem] leading-[1.55] text-[var(--danger)]">
                  {submitError}
                  <PayHelp text={en ? E.payHelp : "결제가 계속 되지 않으면 성함, 연락처, 희망 일시를 이메일로 보내주세요. 예약을 도와드릴게요."} />
                </div>
              )}

              <button
                type="button"
                disabled={paying}
                onClick={handlePay}
                className="mt-[18px] block w-full rounded-[11px] bg-[var(--accent)] px-2 whitespace-nowrap py-[22px] text-center text-[clamp(1.1rem,calc((100vw_-_110px)/10.5),1.84rem)] font-bold leading-tight tracking-tight text-white transition-[filter,opacity] hover:brightness-[1.06] disabled:pointer-events-none disabled:opacity-60"
              >
                {paying ? (en ? E.paying : "결제창 여는 중…") : en ? E.payButton(EN_DEPOSIT_USD) : "50,000원 결제하기"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutClient({ lang = "ko" }: { lang?: Lang }) {
  return (
    <Suspense fallback={null}>
      <CheckoutForm lang={lang} />
    </Suspense>
  );
}
