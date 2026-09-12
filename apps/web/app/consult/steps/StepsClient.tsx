"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProcedureStep } from "@/lib/admin/media";

const VIDEO_WATCHED_KEY = "faceLiftVideoWatched";

export default function StepsClient({ steps }: { steps: ProcedureStep[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // 영상 시청 전에 이 화면으로 바로 들어온 경우 안내 화면으로 되돌린다.
    try {
      if (localStorage.getItem(VIDEO_WATCHED_KEY) !== "1") {
        router.replace("/consult");
      }
    } catch {
      // localStorage 접근 불가 시에는 그냥 진행하게 둔다.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (steps.length === 0) {
    return (
      <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
        <div className="mx-auto max-w-[640px] px-5 py-12 pb-16 text-center">
          <p className="mb-6 text-[0.88rem] text-[var(--ink-soft)]">등록된 진행 과정이 없습니다.</p>
          <button
            type="button"
            onClick={() => router.push("/consult/schedule")}
            className="rounded-[10px] bg-[var(--accent)] px-6 py-3.5 text-[0.92rem] font-bold text-white"
          >
            상담 예약하기
          </button>
        </div>
      </div>
    );
  }

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  function goNext() {
    if (isLast) {
      router.push("/consult/simulation");
      return;
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrev() {
    if (isFirst) return;
    setIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[640px] px-5 py-12 pb-16">
        <div className="mb-7">
          <div className="mb-2.5 text-xs font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
            Face Lift 전문 · 박동만 원장
          </div>
          <h1 className="mb-2.5 font-[family-name:var(--font-display)] text-[1.7rem] font-bold">진행 과정</h1>
          <p className="text-sm leading-[1.65] text-[var(--ink-soft)]">
            Face Lift(안면거상술)가 어떤 순서로 진행되는지 한 단계씩 확인해보세요.
          </p>
        </div>

        {/* 진행 표시 */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= index ? "bg-[var(--accent)]" : "bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
        <div className="mb-6 text-center text-[0.76rem] font-semibold text-[var(--ink-soft)]">
          {index + 1} / {steps.length}
        </div>

        {/* 현재 단계 카드 */}
        <div className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--accent-soft)] font-[family-name:var(--font-mono-kr)] text-[0.92rem] font-semibold text-[var(--accent-ink)]">
              {step.step_order}
            </span>
            <h2 className="text-[1.05rem] font-bold">{step.title}</h2>
          </div>

          {step.media_url &&
            (step.media_type === "video" ? (
              <video
                key={step.media_url}
                src={step.media_url}
                controls
                playsInline
                className="mb-4 w-full rounded-lg bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={step.media_url}
                alt={step.title}
                className="mb-4 w-full rounded-lg object-cover"
              />
            ))}

          <p className="text-[0.9rem] leading-[1.7] text-[var(--ink-soft)]">{step.description}</p>
        </div>

        {/* 안내 사항 */}
        <div className="mb-8 flex gap-2.5 rounded-xl bg-[var(--warn-soft)] px-4 py-3.5 text-[0.78rem] leading-[1.65] text-[var(--warn-ink)]">
          <span>⚠</span>
          <span>
            <b className="text-[var(--ink)]">안내 사항.</b> 위 내용은 Face Lift(안면거상술)의
            일반적인 진행 과정을 설명한 것으로, 실제 절개 범위·마취 방법·회복 기간은 개인의 얼굴
            구조와 상태에 따라 달라지며 방문 상담을 통해 원장이 최종 결정합니다.
          </span>
        </div>

        {/* 이전/다음 */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className="flex-1 rounded-[10px] border border-[var(--line)] py-3.5 text-center text-[0.92rem] font-bold text-[var(--ink)] transition-opacity hover:bg-[var(--accent-soft)] disabled:pointer-events-none disabled:opacity-35"
          >
            ‹ 이전
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex-[1.4] rounded-[10px] bg-[var(--accent)] py-3.5 text-center text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-[1.06]"
          >
            {isLast ? "다음 · AI 시뮬레이션 보기" : "다음 ›"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/consult/schedule")}
          className="mt-3.5 block w-full text-center text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--accent-ink)]"
        >
          AI 시뮬레이션 생략하고 상담 예약하기
        </button>
      </div>
    </div>
  );
}
