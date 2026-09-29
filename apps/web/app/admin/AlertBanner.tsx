"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUnacknowledgedAlerts, acknowledgeAlert, type AdminAlert } from "@/lib/admin/alerts";

const POLL_MS = 5000;
const BEEP_INTERVAL_MS = 2000;

/** 짧은 알림음을 반복 재생한다. Web Audio API로 직접 소리를 만들어서 별도 음원 파일이 필요 없다. */
function startBeeping(getCtx: () => AudioContext | null) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  function beepOnce() {
    if (stopped) return;
    const ctx = getCtx();
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
    timer = setTimeout(beepOnce, BEEP_INTERVAL_MS);
  }
  beepOnce();
  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}

/** 예약 확정 등 관리자가 놓치면 안 되는 알림을 화면 위에 띄우고, 확인을 누르기 전까지 소리를 반복한다. */
export function AlertBanner() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [acking, setAcking] = useState<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beeperRef = useRef<{ stop: () => void } | null>(null);

  const poll = useCallback(() => {
    getUnacknowledgedAlerts().then(setAlerts).catch(() => {});
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  // 브라우저는 사용자 조작 없이 소리를 재생하지 못하게 막는다 — 관리자가 화면을 한 번이라도
  // 클릭/터치하면 오디오 컨텍스트를 미리 준비해둬서, 정작 알림이 뜰 때는 바로 소리가 나게 한다.
  useEffect(() => {
    function unlock() {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      } else if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (alerts.length > 0 && !beeperRef.current) {
      beeperRef.current = startBeeping(() => audioCtxRef.current);
    } else if (alerts.length === 0 && beeperRef.current) {
      beeperRef.current.stop();
      beeperRef.current = null;
    }
  }, [alerts.length]);

  useEffect(
    () => () => {
      beeperRef.current?.stop();
    },
    [],
  );

  async function handleAck(id: string) {
    setAcking((s) => new Set(s).add(id));
    await acknowledgeAlert(id);
    poll();
  }

  if (alerts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col gap-1.5 bg-[var(--danger)] p-2.5 shadow-lg">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="mx-auto flex w-full max-w-[700px] items-center justify-between gap-3 rounded-lg bg-white/15 px-3.5 py-2 text-[0.84rem] font-semibold text-white"
        >
          <span>🔔 {a.message}</span>
          <button
            type="button"
            disabled={acking.has(a.id)}
            onClick={() => handleAck(a.id)}
            className="flex-none rounded-md bg-white px-3 py-1.5 text-[0.78rem] font-bold text-[var(--danger)] disabled:opacity-50"
          >
            확인
          </button>
        </div>
      ))}
    </div>
  );
}
