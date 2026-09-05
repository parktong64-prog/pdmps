"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Angle = "left" | "front" | "right";

const ANGLES: { key: Angle; label: string; hint: string }[] = [
  { key: "left", label: "좌측면", hint: "45˚ 측면" },
  { key: "front", label: "정면", hint: "정면 응시" },
  { key: "right", label: "우측면", hint: "45˚ 측면" },
];

type View = "upload" | "processing" | "result";

export default function SimulationPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("upload");
  const [photos, setPhotos] = useState<Record<Angle, string | null>>({
    left: null,
    front: null,
    right: null,
  });
  const fileInputs = useRef<Record<Angle, HTMLInputElement | null>>({
    left: null,
    front: null,
    right: null,
  });

  const uploadedCount = ANGLES.filter((a) => photos[a.key]).length;
  const allUploaded = uploadedCount === 3;

  function handleFileChange(angle: Angle, file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPhotos((prev) => ({ ...prev, [angle]: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function handleMake() {
    setView("processing");
    // AI 생성 처리 시간을 흉내 (실제로는 서버의 AI 이미지 생성 호출)
    setTimeout(() => setView("result"), 1600);
  }

  function handleRetry() {
    setPhotos({ left: null, front: null, right: null });
    ANGLES.forEach((a) => {
      const input = fileInputs.current[a.key];
      if (input) input.value = "";
    });
    setView("upload");
  }

  return (
    <div className="flex-1 bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[640px] px-5 py-12 pb-16">
        <div className="mb-7">
          <div className="mb-2.5 text-xs font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
            Face Lift 전문 · 박동만 원장
          </div>
          <h1 className="mb-2.5 font-[family-name:var(--font-display)] text-[1.6rem] font-bold">
            AI 시뮬레이션
          </h1>
          <p className="text-[0.88rem] leading-[1.65] text-[var(--ink-soft)]">
            좌측면·정면·우측면 3장을 업로드하면 AI가 예상되는 변화를 보여드려요. 실제 시술
            결과와는 다를 수 있습니다.
          </p>
        </div>

        {view === "upload" && (
          <div>
            <div className="grid grid-cols-3 gap-2.5">
              {ANGLES.map((a) => {
                const photo = photos[a.key];
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => fileInputs.current[a.key]?.click()}
                    className={`relative aspect-[3/4] overflow-hidden rounded-xl border-[1.6px] bg-[var(--card-bg)] p-2.5 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] ${
                      photo
                        ? "border-solid border-[var(--success)] p-0"
                        : "border-dashed border-[var(--line)]"
                    }`}
                  >
                    {photo ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={`${a.label} 업로드 사진`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <span className="absolute top-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 font-[family-name:var(--font-mono-kr)] text-[0.58rem] font-semibold text-white">
                          {a.label}
                        </span>
                        <span className="absolute top-1.5 right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--success)] text-[0.62rem] text-white">
                          ✓
                        </span>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--accent-soft)] text-[1.1rem] text-[var(--accent-ink)]">
                          ＋
                        </div>
                        <div className="text-[0.76rem] font-bold">{a.label}</div>
                        <div className="text-[0.62rem] text-[var(--ink-soft)]">{a.hint}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {ANGLES.map((a) => (
              <input
                key={a.key}
                ref={(el) => {
                  fileInputs.current[a.key] = el;
                }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFileChange(a.key, e.target.files?.[0] ?? null)}
              />
            ))}

            <p className="mt-3.5 text-center text-[0.76rem] text-[var(--ink-soft)]">
              {allUploaded
                ? "3장 업로드 완료! 아래 버튼을 눌러 시뮬레이션을 만들어보세요."
                : `3장을 모두 업로드하면 시뮬레이션을 만들 수 있어요 (${uploadedCount}/3)`}
            </p>

            <button
              type="button"
              disabled={!allUploaded}
              onClick={handleMake}
              className="mt-5 block w-full rounded-[10px] bg-[var(--accent)] py-3.5 text-center text-[0.92rem] font-bold text-white transition-[filter,opacity] hover:brightness-[1.06] disabled:pointer-events-none disabled:opacity-40"
            >
              AI 시뮬레이션 만들기
            </button>
          </div>
        )}

        {view === "processing" && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] px-5 py-11 text-center">
            <div className="mx-auto mb-4 h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-[var(--accent-soft)] border-t-[var(--accent)]" />
            <p className="text-[0.84rem] text-[var(--ink-soft)]">
              AI가 세 장의 사진을 분석해 시뮬레이션을 만들고 있어요…
            </p>
          </div>
        )}

        {view === "result" && (
          <div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
              <div>
                <div className="mb-2.5 flex items-center gap-1.5 text-[0.78rem] font-bold">
                  <span className="h-[9px] w-[9px] rounded-full bg-[var(--line)]" />
                  Before
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ANGLES.map((a) => (
                    <div key={a.key} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photos[a.key] ?? undefined}
                        alt={`시술 전 ${a.label}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 font-[family-name:var(--font-mono-kr)] text-[0.58rem] font-semibold text-white">
                        {a.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2.5 flex items-center gap-1.5 text-[0.78rem] font-bold">
                  <span className="h-[9px] w-[9px] rounded-full bg-[var(--accent)]" />
                  After (AI 예상)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ANGLES.map((a) => (
                    <div key={a.key} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photos[a.key] ?? undefined}
                        alt={`AI 예상 ${a.label}`}
                        className="absolute inset-0 h-full w-full object-cover brightness-[1.05] contrast-[1.05] saturate-[1.08]"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 font-[family-name:var(--font-mono-kr)] text-[0.58rem] font-semibold text-white">
                        {a.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3.5 text-[0.7rem] leading-[1.55] text-[var(--ink-soft)]">
                데모 화면입니다 — 실제 서비스에서는 AI가 처짐 개선을 반영한 이미지를 새로
                생성합니다. 지금은 업로드하신 사진에 색 보정만 적용해 보여드려요.
              </p>
            </div>

            <div className="my-[22px] flex gap-2.5 rounded-xl bg-[var(--warn-soft)] px-4 py-3.5 text-[0.78rem] leading-[1.65] text-[var(--warn-ink)]">
              <span>⚠</span>
              <span>
                <b className="text-[var(--ink)]">AI 예상 이미지 안내.</b> 위 시뮬레이션은 AI가
                생성한 참고용 이미지로 실제 시술 결과를 보장하지 않으며 의학적 진단을 대체하지
                않습니다. 정확한 진단과 예상 결과는 방문 상담에서 원장이 안내합니다.
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/consult/schedule")}
              className="block w-full rounded-[10px] bg-[var(--accent)] py-3.5 text-center text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-[1.06]"
            >
              다음 · 상담 예약하기
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3.5 block w-full text-center text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2"
            >
              다른 사진으로 다시 해보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
