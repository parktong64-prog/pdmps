"use client";

import Link from "next/link";
import { useFunnelTrack } from "@/lib/funnel/useFunnelTrack";

const FACELIFT = {
  title: "안면거상술",
  body: "나이가 들면서 볼과 중안면부가 아래로 처지고, 팔자주름이 깊어지며 턱선이 흐려지고 목 주름도 두드러지게 나타납니다.",
  tip: "처진 피부 아래 근막(SMAS)을 끌어올려 고정해 팔자주름·턱선·목선을 함께 정리하는 데 도움을 줄 수 있어요.",
};

export default function HomeClient({ basePrice }: { basePrice: number }) {
  useFunnelTrack("home");

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[460px] px-5 py-8 pb-16">
        {/* 상단 로고 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="font-[family-name:var(--font-display)] text-[1.15rem] font-bold text-[var(--brand-green)]">
            PDMPS
          </div>
          <div className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.4px] border-[var(--line)] text-[var(--ink-soft)] text-xs">
            ●
            <span className="absolute -right-px -top-px h-2 w-2 rounded-full border-2 border-[var(--page-bg)] bg-[var(--accent)]" />
          </div>
        </div>

        {/* Face Lift 소개 */}
        <h2 className="mb-3.5 font-[family-name:var(--font-display)] text-[1.05rem] font-bold">
          Face Lift 안내
        </h2>
        <div className="mb-7 flex items-center gap-3.5 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-3.5">
          <div className="h-14 w-14 flex-none rounded-[11px] bg-linear-to-br from-[var(--accent-soft)] to-[var(--line)]" />
          <div>
            <div className="text-sm font-bold">Face Lift (안면거상술)</div>
            <div className="mt-1 font-[family-name:var(--font-mono-kr)] text-[0.86rem] font-semibold text-[var(--accent-ink)]">
              ₩{basePrice.toLocaleString()}
              <span className="ml-1 font-[family-name:var(--font-body)] text-[0.68rem] font-medium text-[var(--ink-soft)]">
                VAT 포함
              </span>
            </div>
          </div>
        </div>

        {/* 고민 부위 */}
        <h2 className="mb-3.5 font-[family-name:var(--font-display)] text-[1.05rem] font-bold">
          이런 분께 추천해요
        </h2>
        <div className="mb-3.5 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          <div className="mb-2 text-sm font-bold">{FACELIFT.title}</div>
          <div className="text-[0.84rem] leading-[1.7] text-[var(--ink-soft)]">{FACELIFT.body}</div>
          <div className="mt-3 border-t border-dashed border-[var(--line)] pt-3 text-[0.8rem] leading-[1.6] text-[var(--accent-ink)]">
            <b className="text-[var(--ink)]">안면거상술은</b> {FACELIFT.tip}
          </div>
        </div>

        <p className="mx-0.5 mb-7 text-[0.72rem] leading-[1.6] text-[var(--ink-soft)]">
          위 설명은 일반적인 특징 안내이며, 정확한 원인과 개선 방법은 방문 상담에서 원장이 직접 확인 후 안내합니다.
        </p>

        <Link
          href="/consult"
          className="block rounded-[11px] bg-[var(--accent)] py-[15px] text-center text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-[1.06]"
        >
          상담예약하기
        </Link>
      </div>
    </div>
  );
}
