import Link from "next/link";
import { BUSINESS } from "@/lib/business";

export function SiteFooter() {
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
