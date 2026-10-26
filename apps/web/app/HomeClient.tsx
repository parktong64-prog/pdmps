"use client";

import Link from "next/link";
import { useFunnelTrack } from "@/lib/funnel/useFunnelTrack";
import { TEXT, localePath, EN_DEPOSIT_USD, type Lang } from "@/lib/i18n/patient";

export default function HomeClient({ basePrice, lang = "ko" }: { basePrice: number; lang?: Lang }) {
  useFunnelTrack("home");
  const t = TEXT[lang];

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className={`mx-auto max-w-[460px] px-5 pb-16 ${lang === "en" ? "py-3" : "py-8"}`}>
        {/* 상단 로고 */}
        <div className={`flex items-center justify-between ${lang === "en" ? "mb-3" : "mb-6"}`}>
          <div className="font-[family-name:var(--font-display)] text-[1.15rem] font-bold text-[var(--brand-green)]">
            {t.brand}
          </div>
          <div className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.4px] border-[var(--line)] text-[var(--ink-soft)] text-xs">
            ●
            <span className="absolute -right-px -top-px h-2 w-2 rounded-full border-2 border-[var(--page-bg)] bg-[var(--accent)]" />
          </div>
        </div>

        {/* Face Lift 소개 */}
        <h2 className="mb-3.5 font-[family-name:var(--font-display)] text-[1.05rem] font-bold">{t.homeGuideTitle}</h2>
        <div className={`flex items-center gap-3.5 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-3.5 ${lang === "en" ? "mb-4" : "mb-7"}`}>
          <div className="h-14 w-14 flex-none rounded-[11px] bg-linear-to-br from-[var(--accent-soft)] to-[var(--line)]" />
          <div>
            <div className="text-sm font-bold">{t.homeProductName}</div>
            <div className="mt-1 font-[family-name:var(--font-mono-kr)] text-[0.86rem] font-semibold text-[var(--accent-ink)]">
              {lang === "en" ? `$${EN_DEPOSIT_USD} deposit` : `₩${basePrice.toLocaleString()}`}
              <span className="ml-1 font-[family-name:var(--font-body)] text-[0.68rem] font-medium text-[var(--ink-soft)]">
                {lang === "en" ? "booking deposit" : t.homeVat}
              </span>
            </div>
          </div>
        </div>

        {/* 고민 부위 */}
        <h2 className="mb-3.5 font-[family-name:var(--font-display)] text-[1.05rem] font-bold">{t.homeForWhom}</h2>
        <div className={`mb-3.5 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] ${lang === "en" ? "p-3.5" : "p-[18px]"}`}>
          <div className="mb-2 text-sm font-bold">{t.homeCardTitle}</div>
          <div className={`text-[0.84rem] text-[var(--ink-soft)] ${lang === "en" ? "leading-[1.5]" : "leading-[1.7]"}`}>{t.homeCardBody}</div>
        </div>

        <p className={`mx-0.5 text-[0.72rem] leading-[1.6] text-[var(--ink-soft)] ${lang === "en" ? "mb-4" : "mb-7"}`}>{t.homeDisclaimer}</p>

        <Link
          href={localePath(lang, "/consult")}
          className="block rounded-[11px] bg-[var(--accent)] py-[22px] text-center text-[1.7rem] font-bold leading-none tracking-wide text-white transition-[filter] hover:brightness-[1.06]"
        >
          {t.homeCta}
        </Link>
      </div>
    </div>
  );
}
