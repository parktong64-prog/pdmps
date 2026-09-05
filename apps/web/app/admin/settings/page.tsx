"use client";

import { useEffect, useRef, useState } from "react";
import { getProcedureSettings, updateProcedureSettings, getActiveVideo, updateVideoTitle } from "@/lib/admin/actions";

type Stab = "procedure" | "templates" | "videos";
const TABS: { key: Stab; label: string }[] = [
  { key: "procedure", label: "시술 항목" },
  { key: "templates", label: "알림 템플릿" },
  { key: "videos", label: "시술 안내 영상" },
];

export default function SettingsPage() {
  const [stab, setStab] = useState<Stab>("procedure");

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">설정</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">시술 항목 · 알림 템플릿 · 시술 영상</div>
      </div>

      <div className="mb-[18px] flex flex-wrap gap-5 border-b border-[var(--line)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStab(t.key)}
            className={`border-b-2 pb-2.5 text-[0.82rem] font-semibold ${
              stab === t.key ? "border-[var(--accent)] text-[var(--ink)]" : "border-transparent text-[var(--ink-soft)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        {stab === "procedure" && <ProcedureTab />}
        {stab === "templates" && <TemplatesTab />}
        {stab === "videos" && <VideosTab />}
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString();
}

function ProcedureTab() {
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [priceInput, setPriceInput] = useState("");
  const [depositInput, setDepositInput] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getProcedureSettings().then((p) => {
      if (p) {
        setId(p.id);
        setName(p.name);
        setActive(p.is_active);
        setPriceInput(fmt(p.base_price));
        setDepositInput(fmt(p.deposit_amount));
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      const base_price = Number(priceInput.replace(/\D/g, "")) || 0;
      const deposit_amount = Number(depositInput.replace(/\D/g, "")) || 0;
      await updateProcedureSettings({ id, name, base_price, deposit_amount, is_active: active });
      setPriceInput(fmt(base_price));
      setDepositInput(fmt(deposit_amount));
      setShowToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setShowToast(false), 2200);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">불러오는 중…</div>;
  }

  return (
    <div className="flex max-w-[420px] flex-col gap-[18px]">
      <Field label="시술명">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--card-bg)] px-3 py-2.5 text-[0.88rem] outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <Field label="기준 시술비 (원, VAT 포함)">
        <input
          type="text"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--card-bg)] px-3 py-2.5 text-[0.88rem] outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <Field label="예약금 (원)" note="예약금은 환불 불가 정책과 연동되어 있어요. 변경 시 신중하게 결정해주세요.">
        <input
          type="text"
          value={depositInput}
          onChange={(e) => setDepositInput(e.target.value)}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--card-bg)] px-3 py-2.5 text-[0.88rem] outline-none focus:border-[var(--accent)]"
        />
      </Field>

      <div className="flex items-center justify-between">
        <span className="text-[0.84rem] font-semibold">환자 앱에 노출</span>
        <label className="relative inline-block h-6 w-[42px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
          />
          <span className="absolute inset-0 rounded-full bg-[var(--line)] transition-colors peer-checked:bg-[var(--accent)]" />
          <span className="absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform peer-checked:translate-x-[18px]" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-[var(--accent)] px-[18px] py-2.5 text-[0.84rem] font-bold text-white hover:brightness-[1.06] disabled:opacity-60"
        >
          {saving ? "저장 중…" : "변경사항 저장"}
        </button>
        <span className={`text-[0.78rem] font-semibold text-[var(--st-done)] transition-opacity ${showToast ? "opacity-100" : "opacity-0"}`}>
          저장되었습니다
        </span>
      </div>
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.8rem] font-bold">{label}</label>
      {children}
      {note && <div className="mt-1.5 text-[0.7rem] text-[var(--ink-soft)]">{note}</div>}
    </div>
  );
}

type Template = { key: string; name: string; channel: string; text: string };

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([
    { key: "consult_received", name: "상담 신청 접수확인", channel: "푸시", text: "상담 신청이 접수되었습니다. AI 분석 결과를 확인해보세요." },
    { key: "reservation_confirmed", name: "예약 확정", channel: "알림톡", text: "[PDMPS] {날짜} {시간} Face Lift 상담 예약이 확정되었습니다." },
    { key: "reminder_d1", name: "예약 리마인드 (D-1)", channel: "알림톡", text: "[PDMPS] 내일 {시간} 예약이 있습니다. 잊지 말고 방문해주세요!" },
    { key: "payment_completed", name: "결제 완료", channel: "푸시", text: "예약금 결제가 완료되었습니다." },
    { key: "ai_flag_review", name: "AI 확인 필요 (내부)", channel: "내부", text: "{환자명}님의 AI 분석 결과 확인이 필요합니다." },
  ]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState<number | null>(null);

  function startEdit(i: number) {
    setEditingIdx(i);
    setDraft(templates[i].text);
    setSavedFlash(null);
  }

  function saveEdit(i: number) {
    setTemplates((prev) => prev.map((t, idx) => (idx === i ? { ...t, text: draft } : t)));
    setEditingIdx(null);
    setSavedFlash(i);
  }

  return (
    <div>
      {templates.map((t, i) => (
        <div key={t.key} className="mb-2.5 rounded-xl border border-[var(--line)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span>
              <span className="text-[0.84rem] font-bold">{t.name}</span>
              <span className="ml-2 rounded-full bg-[var(--page-bg)] px-2.5 py-0.5 text-[0.64rem] font-bold text-[var(--ink-soft)]">
                {t.channel}
              </span>
            </span>
            {editingIdx !== i && (
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="text-[0.74rem] font-bold text-[var(--accent-ink)]"
              >
                수정
              </button>
            )}
          </div>

          {editingIdx === i ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[60px] w-full rounded-lg border border-[var(--accent)] bg-[var(--card-bg)] p-2.5 text-[0.82rem] outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => saveEdit(i)}
                  className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[0.76rem] font-bold text-white"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditingIdx(null)}
                  className="text-[0.76rem] text-[var(--ink-soft)]"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[0.82rem] leading-[1.55] text-[var(--ink-soft)]">
              {t.text}
              {savedFlash === i && <span className="ml-2 text-[0.7rem] font-bold text-[var(--st-done)]">저장됨</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatDuration(sec: number | null) {
  if (!sec) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideosTab() {
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getActiveVideo().then((v) => {
      if (v) {
        setId(v.id);
        setTitle(v.title);
        setDurationSec(v.duration_sec);
        setIsActive(v.is_active);
      }
      setLoading(false);
    });
  }, []);

  function handleFile(file: File | null) {
    if (!file || !id) return;
    setProgress(0);
    let pct = 0;
    const timer = setInterval(() => {
      pct += 10;
      setProgress(Math.min(pct, 100));
      if (pct >= 100) {
        clearInterval(timer);
        const newTitle = file.name.replace(/\.[^.]+$/, "");
        updateVideoTitle(id, newTitle).then(() => setTitle(newTitle));
        setProgress(null);
      }
    }, 150);
  }

  if (loading) {
    return <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">불러오는 중…</div>;
  }

  if (!id) {
    return <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">등록된 안내 영상이 없습니다.</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-xl border border-[var(--line)] p-4">
        <div>
          <div className="text-[0.88rem] font-bold">{title}</div>
          <div className="mt-1 text-[0.76rem] text-[var(--ink-soft)]">
            {progress !== null ? (
              <>
                업로드 중…
                <div className="mt-1.5 h-[5px] w-[160px] overflow-hidden rounded-full bg-[var(--line)]">
                  <div className="h-full bg-[var(--accent)] transition-[width] duration-100" style={{ width: `${progress}%` }} />
                </div>
              </>
            ) : (
              <>
                재생시간 {formatDuration(durationSec)} · {isActive ? "노출중" : "비노출"}
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-lg bg-[var(--accent-soft)] px-3.5 py-2 text-[0.8rem] font-bold text-[var(--accent-ink)]"
        >
          제목 변경(파일명 반영)
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <p className="mt-2.5 text-[0.7rem] text-[var(--ink-soft)]">
        실제 영상 파일 업로드·재생 시간 교체는 Storage 연동 후 지원됩니다. 지금은 선택한 파일명으로 제목만 갱신합니다.
      </p>
    </div>
  );
}
