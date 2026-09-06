"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProcedureStep } from "@/lib/admin/media";

const STORAGE_KEY = "faceLiftVideoWatched";

type VideoInfo = {
  title: string;
  duration_sec: number | null;
  video_url: string | null;
} | null;

export default function ConsultClient({ video, steps }: { video: VideoInfo; steps: ProcedureStep[] }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [watched, setWatched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // localStorage는 SSR에서 접근 불가하므로 마운트 후 클라이언트에서만 읽어 상태에 반영한다.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setProgress(100);
        setWatched(true);
      }
    } catch {
      // 개인정보/시크릿 모드 등으로 접근 불가할 수 있음 — 무시하고 미시청 상태로 진행
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function markWatched() {
    setWatched(true);
    setProgress(100);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // 저장 실패해도 이번 세션 진행에는 지장 없음
    }
  }

  // 실제 영상이 등록된 경우: 진짜 <video>를 재생하고 끝까지 보면 시청 완료 처리
  function handleRealPlay() {
    if (watched) return;
    videoRef.current?.play();
    setPlaying(true);
  }
  function handleTimeUpdate() {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  }
  function handleEnded() {
    setPlaying(false);
    markWatched();
  }

  // 영상 미등록 시: 재생 흐름을 흉내내는 시뮬레이션
  function handleSimulatedPlay() {
    if (playing || watched) return;
    setPlaying(true);
    timerRef.current = setInterval(() => {
      setProgress((pct) => {
        const next = Math.min(pct + 4, 100);
        if (next >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPlaying(false);
          markWatched();
        }
        return next;
      });
    }, 120);
  }

  const durationLabel = video?.duration_sec
    ? `${Math.floor(video.duration_sec / 60)}:${String(video.duration_sec % 60).padStart(2, "0")}`
    : "3:24";

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[640px] px-5 py-12 pb-16">
        {/* 히어로 */}
        <div className="mb-7">
          <div className="mb-2.5 text-xs font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
            Face Lift 전문 · 박동만 원장
          </div>
          <h1 className="mb-2.5 font-[family-name:var(--font-display)] text-[1.7rem] font-bold">
            수술 방법 안내
          </h1>
          <p className="text-sm leading-[1.65] text-[var(--ink-soft)]">
            Face Lift(안면거상술)가 어떤 과정으로 진행되는지 미리 확인하세요. 실제 시술 범위와
            방법은 방문 상담에서 원장이 진단 후 최종 결정합니다.
          </p>
        </div>

        {/* 팩트 스트립 */}
        <div className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)]">
          {[
            { v: "3~4시간", l: "평균 소요시간" },
            { v: "수면·국소", l: "마취 방법" },
            { v: "당일 귀가", l: "입원 여부" },
          ].map((f) => (
            <div key={f.l} className="bg-[var(--card-bg)] px-2.5 py-3.5 text-center">
              <div className="font-[family-name:var(--font-mono-kr)] text-[1.05rem] font-semibold">{f.v}</div>
              <div className="mt-1 text-[0.66rem] text-[var(--ink-soft)]">{f.l}</div>
            </div>
          ))}
        </div>

        {/* 영상 카드 */}
        <div className="mb-9 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          {video?.video_url ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-[11px] bg-black">
              <video
                ref={videoRef}
                src={video.video_url}
                controls
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className="h-full w-full"
              />
              {!playing && !watched && (
                <button
                  type="button"
                  onClick={handleRealPlay}
                  aria-label="시술 안내 영상 재생"
                  className="absolute inset-0 flex items-center justify-center bg-black/10"
                >
                  <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-white/25">
                    <div className="ml-1 h-0 w-0 border-y-[11px] border-l-[18px] border-y-transparent border-l-white" />
                  </div>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSimulatedPlay}
              aria-label="시술 안내 영상 재생"
              className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-[11px] border-none bg-[linear-gradient(145deg,#241d20,#3a2c30)] p-0"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-white/15 transition-transform hover:scale-105">
                  {watched ? (
                    <span className="text-[1.3rem] text-white">✓</span>
                  ) : (
                    <div className="ml-1 h-0 w-0 border-y-[11px] border-l-[18px] border-y-transparent border-l-white" />
                  )}
                </div>
              </div>
              <div className="absolute bottom-3 left-3.5 text-left text-sm font-semibold text-white">
                {video?.title ?? "Face Lift 과정 안내"}
                <span className="mt-0.5 block text-[0.66rem] font-normal text-[#d8cdd0]">
                  박동만 원장 · {durationLabel}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <div
                  className="h-full bg-[var(--accent)] transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </button>
          )}

          <div className="mt-3 flex items-center justify-between text-[0.76rem] text-[var(--ink-soft)]">
            {watched ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-[var(--success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                시청 완료
              </span>
            ) : (
              <span>{playing ? "재생 중…" : "아직 시청하지 않았어요"}</span>
            )}
          </div>
          {!video?.video_url && (
            <p className="mt-2.5 text-[0.7rem] leading-[1.5] text-[var(--ink-soft)]">
              실제 시술 안내 영상 업로드 전 미리보기 화면입니다. 재생 버튼을 누르면 시청 흐름을
              확인할 수 있어요.
            </p>
          )}
        </div>

        {/* 진행 과정 */}
        <h2 className="mb-[18px] font-[family-name:var(--font-display)] text-[1.15rem] font-bold">
          진행 과정
        </h2>
        <ol className="mb-9 list-none p-0">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className={`grid grid-cols-[34px_1fr] gap-3.5 py-4 ${
                i < steps.length - 1 ? "border-b border-[var(--line)]" : ""
              }`}
            >
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--accent-soft)] font-[family-name:var(--font-mono-kr)] text-[0.82rem] font-semibold text-[var(--accent-ink)]">
                {step.step_order}
              </span>
              <div>
                <h3 className="mb-1 text-[0.92rem] font-bold">{step.title}</h3>
                <p className="text-[0.82rem] leading-[1.65] text-[var(--ink-soft)]">{step.description}</p>
                {step.media_url &&
                  (step.media_type === "video" ? (
                    <video src={step.media_url} controls playsInline className="mt-2.5 w-full max-w-[280px] rounded-lg bg-black" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={step.media_url}
                      alt={step.title}
                      className="mt-2.5 w-full max-w-[280px] rounded-lg object-cover"
                    />
                  ))}
              </div>
            </li>
          ))}
        </ol>

        {/* 안내 사항 */}
        <div className="mb-8 flex gap-2.5 rounded-xl bg-[var(--warn-soft)] px-4 py-3.5 text-[0.78rem] leading-[1.65] text-[var(--warn-ink)]">
          <span>⚠</span>
          <span>
            <b className="text-[var(--ink)]">안내 사항.</b> 위 내용은 Face Lift(안면거상술)의
            일반적인 진행 과정을 설명한 것으로, 실제 절개 범위·마취 방법·회복 기간은 개인의 얼굴
            구조와 상태에 따라 달라지며 방문 상담을 통해 원장이 최종 결정합니다.
          </span>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={!watched}
            onClick={() => router.push("/consult/simulation")}
            className="rounded-[10px] bg-[var(--accent)] py-3.5 text-center text-[0.92rem] font-bold text-white transition-[filter,opacity] hover:brightness-[1.06] disabled:pointer-events-none disabled:opacity-45"
          >
            다음 · AI 시뮬레이션 보기
          </button>
          <span className="text-center text-[0.72rem] text-[var(--ink-soft)]">
            {watched ? "시청이 완료되었습니다" : "영상을 재생하면 다음 단계로 진행할 수 있어요"}
          </span>
        </div>
      </div>
    </div>
  );
}
