"use client";

import { useState } from "react";
import Link from "next/link";

type ConcernKey = "nasolabial" | "jawline" | "neck";

const CONCERNS: Record<ConcernKey, { title: string; body: string; tip: string }> = {
  nasolabial: {
    title: "팔자주름",
    body: "코 옆에서 입가로 이어지는 깊은 주름으로, 나이가 들며 볼과 중안면부가 아래로 처지면서 더 두드러지게 나타납니다.",
    tip: "처진 볼과 피부를 끌어올려 팔자주름을 완화하는 데 도움을 줄 수 있어요.",
  },
  jawline: {
    title: "턱선 처짐",
    body: "턱과 목의 경계가 흐려지고 갸름했던 라인이 아래로 처지는 현상으로, 피부 아래 근막(SMAS)이 이완되며 나타납니다.",
    tip: "근막(SMAS)을 끌어올려 고정해 턱선을 선명하게 정리합니다.",
  },
  neck: {
    title: "목주름",
    body: "목 피부와 근육의 탄력이 떨어지며 생기는 가로 또는 세로 주름으로, 나이보다 더 들어 보이게 하는 대표적인 부위예요.",
    tip: "넥 리프팅을 함께 진행하면 목선 개선에 도움이 됩니다.",
  },
};

const CHIPS: { key: ConcernKey; label: string }[] = [
  { key: "nasolabial", label: "팔자주름" },
  { key: "jawline", label: "턱선 처짐" },
  { key: "neck", label: "목주름" },
];

export default function Home() {
  const [active, setActive] = useState<ConcernKey>("nasolabial");
  const concern = CONCERNS[active];

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

        {/* 배너 */}
        <div className="mb-6 rounded-2xl bg-[var(--accent-soft)] px-[18px] py-4">
          <b className="mb-1 block text-sm text-[var(--accent-ink)]">가을 Face Lift 상담 주간</b>
          <span className="text-xs text-[var(--ink-soft)]">9.8 – 9.30 박동만 원장 직접 상담</span>
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
              ₩27,500,000
              <span className="ml-1 font-[family-name:var(--font-body)] text-[0.68rem] font-normal text-[var(--ink-soft)]">
                VAT 포함
              </span>
            </div>
          </div>
        </div>

        {/* 고민 부위 */}
        <h2 className="mb-3.5 font-[family-name:var(--font-display)] text-[1.05rem] font-bold">
          이런 분께 추천해요
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActive(chip.key)}
              className={`rounded-full border px-4 py-2.5 text-[0.82rem] font-semibold transition-colors ${
                active === chip.key
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-[var(--card-bg)] text-[var(--ink-soft)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="mb-3.5 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          <div className="mb-2 text-sm font-bold">{concern.title}</div>
          <div className="text-[0.84rem] leading-[1.7] text-[var(--ink-soft)]">{concern.body}</div>
          <div className="mt-3 border-t border-dashed border-[var(--line)] pt-3 text-[0.8rem] leading-[1.6] text-[var(--accent-ink)]">
            <b className="text-[var(--ink)]">Face Lift는</b> {concern.tip}
          </div>
        </div>

        <p className="mx-0.5 mb-7 text-[0.72rem] leading-[1.6] text-[var(--ink-soft)]">
          위 설명은 일반적인 특징 안내이며, 정확한 원인과 개선 방법은 방문 상담에서 원장이 직접 확인 후 안내합니다.
        </p>

        <Link
          href="/consult"
          className="block rounded-[11px] bg-[var(--accent)] py-[15px] text-center text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-[1.06]"
        >
          상담 시작하기
        </Link>
      </div>
    </div>
  );
}
