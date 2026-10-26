import Link from "next/link";
import { BUSINESS } from "@/lib/business";
import { SiteFooter } from "./SiteFooter";
import type { Lang } from "@/lib/i18n/patient";

export function LegalShell({ title, children, lang = "ko" }: { title: string; children: React.ReactNode; lang?: Lang }) {
  const en = lang === "en";
  return (
    <>
      <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
        <div className="mx-auto max-w-[560px] px-5 py-10">
          <Link href={en ? "/en" : "/"} className="text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2">
            {en ? "‹ Back to home" : "‹ 처음으로"}
          </Link>
          <h1 className="mt-4 mb-1 font-[family-name:var(--font-display)] text-[1.4rem] font-bold">{title}</h1>
          <div className="mb-7 text-[0.74rem] text-[var(--ink-soft)]">
            {en ? `PDM Plastic Surgery · Effective ${BUSINESS.policyDateEn}` : `${BUSINESS.name} · 시행일 ${BUSINESS.policyDate}`}
          </div>
          <div className="flex flex-col gap-6 text-[0.86rem] leading-[1.75] text-[var(--ink)]">{children}</div>
        </div>
      </div>
      {/* 영어(/en) 화면은 레이아웃이 영어 푸터를 붙인다 */}
      {!en && <SiteFooter />}
    </>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-[0.95rem] font-bold">{title}</h2>
      <div className="flex flex-col gap-1.5 text-[var(--ink-soft)]">{children}</div>
    </section>
  );
}
