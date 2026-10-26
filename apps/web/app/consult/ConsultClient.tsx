"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnelTrack } from "@/lib/funnel/useFunnelTrack";
import { ENG, SITE_EN, localePath, type Lang } from "@/lib/i18n/patient";

const STORAGE_KEY = "faceLiftVideoWatched";
const STORAGE_KEY_EN = "faceLiftVideoWatchedEn";
// 안내 영상 재생 속도 (1.2배속)
const PLAYBACK_RATE = 1.2;

type VideoInfo = {
  title: string;
  duration_sec: number | null;
  video_url: string | null;
} | null;

export default function ConsultClient({ video, lang = "ko" }: { video: VideoInfo; lang?: Lang }) {
  const en = lang === "en";
  const E = ENG.consult;
  const storageKey = en ? STORAGE_KEY_EN : STORAGE_KEY;
  useFunnelTrack("intro_video");
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [watched, setWatched] = useState(false);
  const [autoMuted, setAutoMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // localStorage는 SSR에서 접근 불가하므로 마운트 후 클라이언트에서만 읽어 상태에 반영한다.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      if (localStorage.getItem(storageKey) === "1") {
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

  // 홈의 "상담예약하기"를 눌러 이 화면에 들어오면 영상을 바로 재생한다. 아직 끝까지 보지 않은 경우만.
  // 브라우저가 소리 있는 자동재생을 막으면 소리를 끈 채로 재생하고, 영상 컨트롤로 소리를 켤 수 있다.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video?.video_url) return;
    try {
      if (localStorage.getItem(storageKey) === "1") return;
    } catch {
      // 저장소 접근이 안 되면 미시청으로 보고 그대로 재생한다
    }
    el.defaultPlaybackRate = PLAYBACK_RATE;
    el.playbackRate = PLAYBACK_RATE;
    el.play().catch(() => {
      el.muted = true;
      setAutoMuted(true);
      el.play().catch(() => {
        // 이것도 막히면 중앙의 재생 버튼으로 직접 시작한다
      });
    });
  }, [video?.video_url]);

  function markWatched() {
    setWatched(true);
    setProgress(100);
    try {
      localStorage.setItem(storageKey, "1");
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
    // 영상이 끝나면 클릭 없이 바로 다음 단계(진행 과정 보기)로 넘어간다.
    router.push(localePath(lang, "/consult/steps"));
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
          router.push(localePath(lang, "/consult/steps"));
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
      <div className="mx-auto max-w-[640px] px-5 pt-4 pb-10">
        {/* 히어로 */}
        <div className="mb-3">
          <div className="mb-1 text-xs font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
            {en ? SITE_EN.eyebrow : "Face Lift 전문 · 박동만 원장"}
          </div>
          <h1 className="mb-1.5 font-[family-name:var(--font-display)] text-[1.7rem] font-bold">
            {en ? E.title : "수술 방법 안내"}
          </h1>
          <p className="text-sm leading-[1.65] text-[var(--ink-soft)]">
            {en
              ? E.lead
              : "Face Lift(안면거상술)가 어떤 과정으로 진행되는지 미리 확인하세요. 실제 시술 범위와 방법은 방문 상담에서 원장이 진단 후 최종 결정합니다."}
          </p>
        </div>

        {/* 팩트 스트립 */}
        <div className="mb-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)]">
          {(en
            ? E.facts
            : [
                { v: "3~4시간", l: "평균 소요시간" },
                { v: "수면·국소", l: "마취 방법" },
                { v: "당일 귀가", l: "입원 여부" },
              ]
          ).map((f) => (
            <div key={f.l} className="bg-[var(--card-bg)] px-2.5 py-3.5 text-center">
              <div className="font-[family-name:var(--font-mono-kr)] text-[1.05rem] font-semibold">{f.v}</div>
              <div className="mt-1 text-[0.66rem] text-[var(--ink-soft)]">{f.l}</div>
            </div>
          ))}
        </div>

        {/* 영상 카드 */}
        <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-3">
          {video?.video_url ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-[11px] bg-black">
              <video
                ref={videoRef}
                src={video.video_url}
                controls
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onLoadedMetadata={(e) => {
                  e.currentTarget.defaultPlaybackRate = PLAYBACK_RATE;
                  e.currentTarget.playbackRate = PLAYBACK_RATE;
                }}
                onVolumeChange={(e) => {
                  if (!e.currentTarget.muted) setAutoMuted(false);
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className="h-full w-full"
              />
              {!playing && !watched && (
                <button
                  type="button"
                  onClick={handleRealPlay}
                  aria-label={en ? E.playLabel : "시술 안내 영상 재생"}
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
              aria-label={en ? E.playLabel : "시술 안내 영상 재생"}
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
                <span className="mt-0.5 block text-[0.66rem] font-medium text-[#d8cdd0]">
                  {en ? E.placeholderBy : "박동만 원장"} · {durationLabel}
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
                {en ? E.watched : "시청 완료"}
              </span>
            ) : (
              <span>{playing ? (en ? E.playing : "재생 중…") : en ? E.notWatched : "아직 시청하지 않았어요"}</span>
            )}
          </div>
          {autoMuted && playing && !watched && (
            <p className="mt-2 text-[0.72rem] leading-[1.5] font-semibold text-[var(--accent-ink)]">
              {en ? E.autoMuted : "소리가 꺼진 채로 재생 중이에요. 영상 아래 스피커 버튼을 눌러 소리를 켜세요."}
            </p>
          )}
          {!video?.video_url && (
            <p className="mt-2.5 text-[0.7rem] leading-[1.5] text-[var(--ink-soft)]">
              {en
                ? E.videoMissing
                : "실제 시술 안내 영상 업로드 전 미리보기 화면입니다. 재생 버튼을 누르면 시청 흐름을 확인할 수 있어요."}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => router.push(localePath(lang, "/consult/steps"))}
            className={`rounded-[11px] bg-[var(--accent)] px-3 py-[22px] text-center font-bold leading-tight tracking-wide text-white transition-[filter,opacity] hover:brightness-[1.06] ${en ? "text-[1.35rem]" : "text-[1.7rem]"}`}
          >
            {en ? E.next : "다음 · 진행 과정 보기"}
          </button>
          <span className="text-center text-[0.72rem] font-bold text-[var(--ink)]">
            {watched
              ? en
                ? E.nextHintWatched
                : "시청이 완료되었습니다"
              : en
                ? E.nextHintNotWatched
                : "영상을 끝까지 보지 않아도 다음 단계로 진행할 수 있어요"}
          </span>
        </div>
      </div>
    </div>
  );
}
