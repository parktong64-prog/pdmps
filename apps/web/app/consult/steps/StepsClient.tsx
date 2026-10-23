"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProcedureStep } from "@/lib/admin/media";
import { useFunnelTrack } from "@/lib/funnel/useFunnelTrack";

export default function StepsClient({ steps }: { steps: ProcedureStep[] }) {
  useFunnelTrack("steps");
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentUrl = steps[index]?.media_url ?? null;
  const currentIsVideo = steps[index]?.media_type === "video";

  // 단계가 바뀌면(또는 처음 들어오면) 영상을 바로 재생한다. 소리 있는 자동재생이 막히면 소리를 끄고 재생한다.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !currentUrl || !currentIsVideo) return;
    el.defaultPlaybackRate = 1.2;
    el.playbackRate = 1.2;
    el.play().catch(() => {
      el.muted = true;
      el.play().catch(() => {
        // 이것도 막히면 영상의 재생 버튼으로 직접 시작한다
      });
    });
  }, [index, currentUrl, currentIsVideo]);

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

  // 합친 영상(segments)이면 재생 위치에 맞는 구간의 제목·설명, 아니면 단계 자체의 제목·설명
  const segments = step.segments && step.segments.length > 0 ? step.segments : null;
  const activeSegment = segments ? ([...segments].reverse().find((sg) => time >= sg.start) ?? segments[0]) : null;
  const caption = activeSegment ?? { title: step.title, description: step.description };

  function goNext() {
    if (isLast) {
      router.push("/consult/schedule");
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

        {/* 진행 표시 — 각 막대를 눌러 해당 단계로 바로 이동. 단계가 하나뿐이면 표시하지 않는다 */}
        {steps.length > 1 && (
          <>
            <div className="mb-6 flex items-center justify-center gap-2">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`${i + 1}단계 · ${s.title}`}
                  onClick={() => {
                    setIndex(i);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= index ? "bg-[var(--accent)]" : "bg-[var(--line)] hover:bg-[var(--accent-soft)]"
                  }`}
                />
              ))}
            </div>
            <div className="mb-6 text-center text-[0.76rem] font-semibold text-[var(--ink-soft)]">
              {index + 1} / {steps.length}
            </div>
          </>
        )}

        {/* 현재 단계 카드 */}
        <div className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--accent-soft)] font-[family-name:var(--font-mono-kr)] text-[0.92rem] font-semibold text-[var(--accent-ink)]">
              {index + 1}
            </span>
            <h2 className="text-[1.05rem] font-bold">{step.title}</h2>
          </div>

          {step.media_url && step.media_type === "video" ? (
            <>
              <video
                ref={videoRef}
                key={step.media_url}
                // #t=0.1: 재생 전에도 첫 화면이 보이게 한다(검은 상자로 보이는 휴대폰 방지)
                src={`${step.media_url}#t=0.1`}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  // 안내 영상은 1.2배속으로 재생한다
                  e.currentTarget.defaultPlaybackRate = 1.2;
                  e.currentTarget.playbackRate = 1.2;
                  setTime(0);
                }}
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onEnded={goNext}
                className="w-full rounded-lg bg-black"
              />
              {/* 영상 아래 자막 — 합친 영상은 지금 재생 구간의 진행 과정을 보여준다 */}
              <div className="mt-3 rounded-lg bg-[var(--accent-soft)] px-4 py-3.5">
                <div className="text-[2.1rem] leading-tight font-bold text-[var(--accent-ink)]">{caption.title}</div>
              </div>
            </>
          ) : (
            <>
              {step.media_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={step.media_url} alt={step.title} className="mb-4 w-full rounded-lg object-cover" />
              )}
              <p className="text-[0.9rem] leading-[1.7] text-[var(--ink-soft)]">{step.description}</p>
            </>
          )}
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
          {steps.length > 1 && (
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className="flex-1 rounded-[10px] border border-[var(--line)] py-3.5 text-center text-[0.92rem] font-bold text-[var(--ink)] transition-opacity hover:bg-[var(--accent-soft)] disabled:pointer-events-none disabled:opacity-35"
          >
            ‹ 이전
          </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className={
              isLast
                ? "flex-[1.4] rounded-[11px] bg-[var(--accent)] px-3 py-[22px] text-center text-[1.7rem] font-bold leading-none tracking-wide text-white transition-[filter] hover:brightness-[1.06]"
                : "flex-[1.4] rounded-[10px] bg-[var(--accent)] py-3.5 text-center text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-[1.06]"
            }
          >
            {isLast ? "상담예약하기" : "다음 ›"}
          </button>
        </div>
      </div>
    </div>
  );
}
