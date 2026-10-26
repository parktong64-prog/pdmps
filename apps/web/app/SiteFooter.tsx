import Link from "next/link";
import { BUSINESS } from "@/lib/business";
import { SITE_EN, type Lang } from "@/lib/i18n/patient";

export function SiteFooter({ lang = "ko" }: { lang?: Lang }) {
  if (lang === "en") {
    return (
      <footer className="border-t border-[var(--line)] bg-[var(--page-bg)] px-5 py-7 text-[0.7rem] leading-[1.75] text-[var(--ink-soft)]">
        <div className="mx-auto max-w-[460px]">
          <div className="mb-1 font-semibold text-[var(--ink)]">{SITE_EN.name}</div>
          <div>CEO {SITE_EN.ceo} · Business reg. no. {BUSINESS.bizNo}</div>
          <div>{SITE_EN.address}</div>
          <div>Website: {SITE_EN.website}</div>
          <div>Tel {SITE_EN.phone}</div>
          <div>
            Privacy officer {BUSINESS.privacyOfficer.name} ({BUSINESS.privacyOfficer.email})
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 font-medium text-[var(--ink)]">
            <Link href="/terms" className="underline underline-offset-2">
              {SITE_EN.terms} (KR)
            </Link>
            <Link href="/privacy" className="underline underline-offset-2">
              {SITE_EN.privacy} (KR)
            </Link>
            <Link href="/refund" className="underline underline-offset-2">
              {SITE_EN.refund} (KR)
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--page-bg)] px-5 py-7 text-[0.7rem] leading-[1.75] text-[var(--ink-soft)]">
      <div className="mx-auto max-w-[460px]">
        <div className="mb-1 font-semibold text-[var(--ink)]">{BUSINESS.name}</div>
        <div>
          대표 {BUSINESS.ceo} · 사업자등록번호 {BUSINESS.bizNo}
        </div>
        <div>{BUSINESS.address}</div>
        <div>전화 {BUSINESS.phone}</div>
        <div>
          개인정보 보호책임자 {BUSINESS.privacyOfficer.name} ({BUSINESS.privacyOfficer.email})
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 font-medium text-[var(--ink)]">
          <Link href="/terms" className="underline underline-offset-2">
            이용약관
          </Link>
          <Link href="/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </Link>
          <Link href="/refund" className="underline underline-offset-2">
            환불 규정
          </Link>
        </div>
      </div>
    </footer>
  );
}
