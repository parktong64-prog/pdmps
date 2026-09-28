import Link from "next/link";
import { BUSINESS } from "@/lib/business";
import { SiteFooter } from "./SiteFooter";

export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
        <div className="mx-auto max-w-[560px] px-5 py-10">
          <Link href="/" className="text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2">
            ‹ 처음으로
          </Link>
          <h1 className="mt-4 mb-1 font-[family-name:var(--font-display)] text-[1.4rem] font-bold">{title}</h1>
          <div className="mb-7 text-[0.74rem] text-[var(--ink-soft)]">
            {BUSINESS.name} · 시행일 {BUSINESS.policyDate}
          </div>
          <div className="flex flex-col gap-6 text-[0.86rem] leading-[1.75] text-[var(--ink)]">{children}</div>
        </div>
      </div>
      <SiteFooter />
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
