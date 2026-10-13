"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MANUAL_TEMPLATES, renderTemplateBody } from "@/lib/notifications/manual-templates";
import { extractPhones, readFileAsText } from "@/lib/phone-extract";
import {
  getTemplateAvailability,
  listPatientsForSend,
  sendAlimtalkBatch,
  recordBroadcast,
  type ManualTemplateInfo,
  type PatientOption,
} from "@/lib/admin/alimtalk-send";

const MAX_RECIPIENTS = 300;
const CHUNK = 25;

const maskPhone = (p: string) => p.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, "$1-****-$3");

export default function AlimtalkSendPage() {
  const [availability, setAvailability] = useState<ManualTemplateInfo[] | null>(null);
  const [templateKey, setTemplateKey] = useState(MANUAL_TEMPLATES[0].key);
  const [values, setValues] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientOption[] | null>(null);
  const [showPatients, setShowPatients] = useState(false);
  const [query, setQuery] = useState("");
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: { phone: string; reason: string }[]; error?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTemplateAvailability().then(setAvailability);
  }, []);

  const template = MANUAL_TEMPLATES.find((t) => t.key === templateKey)!;
  const available = availability?.find((a) => a.key === templateKey)?.available ?? false;
  const { phones, duplicates } = useMemo(() => extractPhones(text), [text]);
  const preview = renderTemplateBody(template.body, values);
  const allFilled = template.variables.every((v) => (values[v.name] ?? "").trim());
  const sending = progress !== null;
  const overLimit = phones.length > MAX_RECIPIENTS;
  const canSend = available && allFilled && phones.length > 0 && !overLimit && consent && !sending;

  const filteredPatients = useMemo(() => {
    const q = query.trim();
    return (patients ?? []).filter((p) => !q || p.name.includes(q) || p.phone.includes(q));
  }, [patients, query]);

  async function onFile(file: File | null) {
    if (!file) return;
    try {
      const body = await readFileAsText(file);
      const found = extractPhones(body);
      setText((prev) => [prev.trim(), ...found.phones].filter(Boolean).join("\n"));
      setFileNote(`${file.name}: 휴대폰 번호 ${found.phones.length}건을 불러왔습니다.`);
    } catch {
      setFileNote("파일을 읽지 못했습니다. 엑셀에서 번호 칸을 복사해 아래 칸에 붙여넣어 주세요.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function openPatients() {
    setShowPatients((v) => !v);
    if (patients === null) setPatients(await listPatientsForSend());
  }

  function addPatient(p: PatientOption) {
    setText((prev) => [prev.trim(), p.phone].filter(Boolean).join("\n"));
  }

  async function handleSend() {
    if (!canSend) return;
    const ok = window.confirm(
      `"${template.name}" 알림톡을 ${phones.length}명에게 발송합니다.\n\n${preview}\n\n발송 후에는 취소할 수 없습니다. 계속할까요?`,
    );
    if (!ok) return;

    setResult(null);
    setProgress({ done: 0, total: phones.length });
    let sent = 0;
    const failed: { phone: string; reason: string }[] = [];
    let fatal: string | undefined;

    for (let i = 0; i < phones.length; i += CHUNK) {
      const chunk = phones.slice(i, i + CHUNK);
      const res = await sendAlimtalkBatch({ templateKey, variables: values, phones: chunk });
      if (!res.ok) {
        fatal = res.error;
        for (const phone of chunk) failed.push({ phone, reason: res.error ?? "발송 실패" });
        break;
      }
      sent += res.sent;
      failed.push(...res.failed);
      setProgress({ done: Math.min(i + CHUNK, phones.length), total: phones.length });
    }

    await recordBroadcast({ templateKey, variables: values, total: phones.length, success: sent, failed: failed.length });
    setResult({ sent, failed, error: fatal });
    setProgress(null);
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-2 text-[0.84rem] outline-none focus:border-[var(--accent)]";

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">알림톡 발송</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">승인된 템플릿으로만 보낼 수 있어요</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
          <div className="mb-2 text-[0.82rem] font-bold">1. 템플릿</div>
          <select
            value={templateKey}
            onChange={(e) => {
              setTemplateKey(e.target.value);
              setValues({});
            }}
            className={inputCls}
          >
            {MANUAL_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[0.74rem] text-[var(--ink-soft)]">용도: {template.purpose}</p>
          {availability && !available && (
            <p className="mt-1.5 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[0.76rem] text-[var(--danger)]">
              이 템플릿은 아직 발송 설정(템플릿 ID 등록)이 되어 있지 않아 보낼 수 없습니다.
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {template.variables.map((v) => (
              <label key={v.name} className="text-[0.76rem] text-[var(--ink-soft)]">
                {v.label}
                <input
                  type="text"
                  value={values[v.name] ?? ""}
                  maxLength={40}
                  placeholder={v.placeholder}
                  onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
                  className={`${inputCls} mt-1`}
                />
              </label>
            ))}
          </div>

          <div className="mt-3 text-[0.76rem] font-semibold text-[var(--ink-soft)]">발송될 내용 미리보기</div>
          <div className="mt-1 rounded-[4px_14px_14px_14px] bg-[#fee500] px-3.5 py-3 text-[0.82rem] leading-[1.6] text-[#3c1e1e]">
            {preview}
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
          <div className="mb-2 text-[0.82rem] font-bold">2. 받는 사람</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"휴대폰 번호를 한 줄에 하나씩 붙여넣으세요.\n010-1234-5678\n엑셀에서 번호 칸을 복사해 붙여넣어도 됩니다."}
            className={`${inputCls} font-[family-name:var(--font-mono-kr)]`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-[var(--line)] px-3 py-1.5 text-[0.76rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)]">
              엑셀·CSV 파일 불러오기
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv,.txt"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              onClick={openPatients}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[0.76rem] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)]"
            >
              {showPatients ? "환자 목록 닫기" : "등록된 환자에서 추가"}
            </button>
            {text && (
              <button type="button" onClick={() => setText("")} className="text-[0.76rem] text-[var(--ink-soft)] underline">
                비우기
              </button>
            )}
          </div>
          {fileNote && <p className="mt-1.5 text-[0.74rem] text-[var(--ink-soft)]">{fileNote}</p>}

          {showPatients && (
            <div className="mt-2 rounded-lg border border-[var(--line)] p-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 또는 번호 검색"
                className={inputCls}
              />
              <div className="mt-1.5 max-h-44 overflow-y-auto">
                {patients === null ? (
                  <div className="py-3 text-center text-[0.76rem] text-[var(--ink-soft)]">불러오는 중…</div>
                ) : filteredPatients.length === 0 ? (
                  <div className="py-3 text-center text-[0.76rem] text-[var(--ink-soft)]">해당하는 환자가 없습니다.</div>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPatient(p)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[0.8rem] hover:bg-[var(--accent-soft)]"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="font-[family-name:var(--font-mono-kr)] text-[0.74rem] text-[var(--ink-soft)]">
                        {maskPhone(p.phone)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-3 rounded-lg bg-[var(--page-bg)] px-3 py-2 text-[0.8rem]">
            받는 사람 <b className="font-[family-name:var(--font-mono-kr)]">{phones.length}</b>명
            {duplicates > 0 && <span className="text-[var(--ink-soft)]"> · 중복 {duplicates}건 제외</span>}
            {overLimit && <span className="text-[var(--danger)]"> · 한 번에 {MAX_RECIPIENTS}명까지 보낼 수 있어요</span>}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
        <div className="mb-2 text-[0.82rem] font-bold">3. 확인 후 발송</div>
        <label className="flex items-start gap-2 text-[0.8rem] leading-[1.6]">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            받는 분이 이 안내를 받을 수 있는 환자(위에 적힌 용도에 해당)임을 확인했습니다. 홍보·이벤트 같은
            광고성 내용은 알림톡으로 보낼 수 없습니다.
          </span>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[0.86rem] font-bold text-white disabled:opacity-40"
          >
            {sending ? `발송 중… ${progress.done}/${progress.total}` : `${phones.length}명에게 발송`}
          </button>
          {!sending && !canSend && (
            <span className="text-[0.76rem] text-[var(--ink-soft)]">
              {!available
                ? "발송 설정이 필요한 템플릿입니다."
                : !allFilled
                  ? "템플릿 변수를 모두 입력하세요."
                  : phones.length === 0
                    ? "받는 사람을 추가하세요."
                    : overLimit
                      ? `${MAX_RECIPIENTS}명 이하로 줄여주세요.`
                      : "확인란을 체크하세요."}
            </span>
          )}
        </div>

        {result && (
          <div className="mt-4 rounded-lg border border-[var(--line)] p-3 text-[0.82rem]">
            <div className="font-bold">
              발송 완료 · 성공 {result.sent}건 · 실패 {result.failed.length}건
            </div>
            {result.error && <p className="mt-1 text-[var(--danger)]">{result.error}</p>}
            {result.failed.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-[0.76rem] text-[var(--ink-soft)]">
                {result.failed.slice(0, 50).map((f) => (
                  <li key={f.phone}>
                    {maskPhone(f.phone)} — {f.reason}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[0.74rem] text-[var(--ink-soft)]">
              알림톡 수신이 불가능한 번호는 문자(SMS)로 대신 나가며, 최종 도착 여부는 솔라피 발송 내역에서 확인하세요.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
