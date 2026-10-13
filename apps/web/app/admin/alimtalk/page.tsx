"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MANUAL_TEMPLATES, renderTemplateBody } from "@/lib/notifications/manual-templates";
import { extractPhones, readFileAsText } from "@/lib/phone-extract";
import {
  HOSPITAL_PREFIX,
  PLACEHOLDERS,
  SMS_MAX_BYTES,
  TEXT_MAX_BYTES,
  fillPlaceholders,
  hasPlaceholders,
  smsByteLength,
} from "@/lib/notifications/text-utils";
import {
  getTemplateAvailability,
  listPatientsForSend,
  listUpcomingReservations,
  sendAlimtalkBatch,
  sendAlimtalkToReservations,
  sendTextBatch,
  sendTextToReservations,
  getSmsSender,
  recordBroadcast,
  type BatchResult,
  type ManualTemplateInfo,
  type PatientOption,
  type ReservationOption,
} from "@/lib/admin/alimtalk-send";

const MAX_RECIPIENTS = 300;
// 한 번의 서버 호출에서 처리할 건수 (서버의 MAX_PER_CALL과 같아야 한다). 작게 나눠야 서버 시간 제한에 안 걸린다.
const CHUNK = 10;
// 서버 응답을 이 시간 넘게 못 받으면 멈춘 것으로 보고 중단한다.
const CALL_TIMEOUT_MS = 45_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const maskPhone = (p: string) => p.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, "$1-****-$3");
type Mode = "numbers" | "reservations";
type Channel = "alimtalk" | "text";

export default function AlimtalkSendPage() {
  const [availability, setAvailability] = useState<ManualTemplateInfo[] | null>(null);
  const [templateKey, setTemplateKey] = useState(MANUAL_TEMPLATES[0].key);
  const [mode, setMode] = useState<Mode>("reservations");
  const [channel, setChannel] = useState<Channel>("alimtalk");
  const [body, setBody] = useState("");
  const [withPrefix, setWithPrefix] = useState(true);
  const [sender, setSender] = useState<string | null | undefined>(undefined);
  const [values, setValues] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientOption[] | null>(null);
  const [showPatients, setShowPatients] = useState(false);
  const [query, setQuery] = useState("");
  const [reservations, setReservations] = useState<ReservationOption[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: { phone: string; reason: string }[]; error?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTemplateAvailability().then(setAvailability);
    listUpcomingReservations().then(setReservations);
    getSmsSender().then(setSender);
  }, []);

  const template = MANUAL_TEMPLATES.find((t) => t.key === templateKey)!;
  const available = availability?.find((a) => a.key === templateKey)?.available ?? false;
  const { phones, duplicates } = useMemo(() => extractPhones(text), [text]);
  const sending = progress !== null;

  const isText = channel === "text";

  // 예약 환자 방식: 이 템플릿으로 보낼 수 있는 예약만 (내일 안내는 내일 예약만). 문자는 모든 확정 예약.
  const eligible = (r: ReservationOption) => isText || templateKey !== "reminder_d1" || r.isTomorrow;
  const eligibleList = (reservations ?? []).filter(eligible);
  const pickedEligible = eligibleList.filter((r) => picked.has(r.id));

  const composeText = (vals: { 이름?: string; 날짜?: string; 시간?: string }) => {
    const filled = fillPlaceholders(body.trim(), vals);
    return withPrefix && filled && !filled.startsWith("[") ? `${HOSPITAL_PREFIX}${filled}` : filled;
  };
  const reservationPreview = (r: ReservationOption) =>
    isText
      ? composeText({ 이름: r.name, 날짜: r.dateLabel, 시간: r.timeLabel })
      : renderTemplateBody(template.body, { 날짜: r.dateLabel, 시간: r.timeLabel });

  const sampleText = composeText({ 이름: "홍길동", 날짜: "2026년 10월 27일(화)", 시간: "16:00" });
  const textBytes = smsByteLength(sampleText);
  const textInvalid =
    isText &&
    (!body.trim() || textBytes > TEXT_MAX_BYTES || (mode === "numbers" && hasPlaceholders(body)) || sender === null);

  // 번호 직접 입력 방식
  const manualPreview = isText ? composeText({}) : renderTemplateBody(template.body, values);
  const allFilled = isText || template.variables.every((v) => (values[v.name] ?? "").trim());
  const overLimit = (mode === "numbers" ? phones.length : pickedEligible.length) > MAX_RECIPIENTS;
  const count = mode === "numbers" ? phones.length : pickedEligible.length;
  const canSend =
    (isText ? !textInvalid : available) &&
    count > 0 &&
    !overLimit &&
    consent &&
    !sending &&
    (mode === "reservations" || allFilled);

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

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (!canSend) return;
    const sample = mode === "numbers" ? manualPreview : reservationPreview(pickedEligible[0]);
    const ok = window.confirm(
      `${isText ? "문자(SMS/LMS)를" : `"${template.name}" 알림톡을`} ${count}명에게 발송합니다.\n\n${sample}${mode === "reservations" && count > 1 ? "\n(받는 분마다 본인 예약 날짜·시간이 들어갑니다)" : ""}\n\n발송 후에는 취소할 수 없습니다. 계속할까요?`,
    );
    if (!ok) return;

    setResult(null);
    const items = mode === "numbers" ? phones : pickedEligible.map((r) => r.id);
    setProgress({ done: 0, total: items.length });
    let sent = 0;
    const failed: { phone: string; reason: string }[] = [];
    let fatal: string | undefined;
    let attempted = 0;

    try {
      for (let i = 0; i < items.length; i += CHUNK) {
        const chunk = items.slice(i, i + CHUNK);
        attempted = i + chunk.length;
        let res: BatchResult;
        try {
          const call = isText
            ? mode === "numbers"
              ? sendTextBatch({ text: body, withPrefix, phones: chunk })
              : sendTextToReservations({ text: body, withPrefix, reservationIds: chunk })
            : mode === "numbers"
              ? sendAlimtalkBatch({ templateKey, variables: values, phones: chunk })
              : sendAlimtalkToReservations({ templateKey, reservationIds: chunk });
          res = await withTimeout(call, CALL_TIMEOUT_MS);
        } catch {
          // 서버와의 연결이 끊겼거나(배포로 화면이 낡은 버전이 된 경우 포함) 응답이 없는 경우.
          // 이미 나간 건이 있을 수 있어 "실패"로 단정하지 않고 확인을 안내한다.
          fatal =
            "서버 응답을 받지 못했습니다. 화면을 새로고침(F5)한 뒤, 솔라피 발송 내역에서 이미 나간 건이 있는지 확인하고 다시 시도하세요.";
          for (const item of chunk) failed.push({ phone: mode === "numbers" ? item : "(예약 선택)", reason: "응답 없음(발송 여부 확인 필요)" });
          break;
        }
        if (!res.ok) {
          fatal = res.error;
          for (const item of chunk) failed.push({ phone: mode === "numbers" ? item : "(예약 선택)", reason: res.error ?? "발송 실패" });
          break;
        }
        sent += res.sent;
        failed.push(...res.failed);
        setProgress({ done: Math.min(i + CHUNK, items.length), total: items.length });
      }
      try {
        await withTimeout(
          recordBroadcast({
            templateKey: isText ? "custom_text" : templateKey,
            variables: isText
              ? { 문구: body.trim().slice(0, 500), 방식: mode === "numbers" ? "번호 직접 입력" : "예약 환자 선택" }
              : mode === "numbers"
                ? values
                : { 방식: "예약 환자 선택" },
            total: attempted,
            success: sent,
            failed: failed.length,
          }),
          15_000,
        );
      } catch {
        // 기록 저장에 실패해도 발송 결과 표시는 막지 않는다.
      }
    } finally {
      setResult({ sent, failed, error: fatal });
      setProgress(null);
      if (mode === "reservations") listUpcomingReservations().then(setReservations).catch(() => {});
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-2 text-[0.84rem] outline-none focus:border-[var(--accent)]";
  const tabCls = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors ${
      active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] text-[var(--ink-soft)]"
    }`;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">알림톡 발송</h1>
        <div className="text-[0.8rem] text-[var(--ink-soft)]">승인된 템플릿으로만 보낼 수 있어요</div>
      </div>

      <section className="mb-4 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="mr-2 text-[0.82rem] font-bold">1. 보내는 방식</div>
          <button type="button" className={tabCls(channel === "alimtalk")} onClick={() => setChannel("alimtalk")}>
            알림톡 (승인된 문구)
          </button>
          <button type="button" className={tabCls(channel === "text")} onClick={() => setChannel("text")}>
            문자 직접 작성 (자유 문구)
          </button>
        </div>

        {isText ? (
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder={"보낼 문구를 직접 작성하세요.\n예) {이름}님, {날짜} {시간} 예약 관련하여 안내드립니다."}
              className={inputCls}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.76rem]">
              <span className="text-[var(--ink-soft)]">환자별로 바뀌는 값 넣기(예약 환자 선택에서만):</span>
              {PLACEHOLDERS.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => setBody((b) => `${b}{${ph}}`)}
                  className="rounded-md border border-[var(--line)] px-2 py-0.5 font-[family-name:var(--font-mono-kr)] text-[var(--ink-soft)] hover:border-[var(--accent)]"
                >
                  {`{${ph}}`}
                </button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-[0.78rem]">
              <input type="checkbox" checked={withPrefix} onChange={(e) => setWithPrefix(e.target.checked)} />
              맨 앞에 <b>{HOSPITAL_PREFIX.trim()}</b> 붙이기
            </label>
            <div className="mt-2 text-[0.76rem] text-[var(--ink-soft)]">
              길이 {textBytes}바이트 · {textBytes > SMS_MAX_BYTES ? "장문(LMS)" : "단문(SMS)"}으로 발송됩니다
              {textBytes > TEXT_MAX_BYTES && (
                <span className="text-[var(--danger)]"> · 너무 깁니다(최대 {TEXT_MAX_BYTES}바이트)</span>
              )}
              {mode === "numbers" && hasPlaceholders(body) && (
                <span className="text-[var(--danger)]"> · {"{이름}"} 등은 &apos;예약 환자 선택&apos;에서만 쓸 수 있어요</span>
              )}
            </div>
            <p className="mt-1 text-[0.76rem] text-[var(--ink-soft)]">
              발신번호: {sender === undefined ? "확인 중…" : (sender ?? "설정되지 않음")}
            </p>
            <p className="mt-2 rounded-lg bg-[var(--st-pending-soft)] px-3 py-2 text-[0.76rem] leading-[1.6] text-[var(--st-pending)]">
              예약·진료 관련 <b>안내</b>(정보성) 문자만 보내세요. 이벤트·홍보 같은 <b>광고성 문자는 수신 동의와
              무료수신거부 번호가 필요</b>해서 이 화면으로 보낼 수 없습니다.
            </p>
          </div>
        ) : (
          <div>
        <select
          value={templateKey}
          onChange={(e) => {
            setTemplateKey(e.target.value);
            setValues({});
          }}
          className={`${inputCls} sm:max-w-sm`}
        >
          {MANUAL_TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[0.74rem] text-[var(--ink-soft)]">용도: {template.purpose}</p>
        <p className="mt-1 text-[0.74rem] text-[var(--ink-soft)]">문구: {template.body}</p>
        {availability && !available && (
          <p className="mt-1.5 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[0.76rem] text-[var(--danger)]">
            이 템플릿은 아직 발송 설정(템플릿 ID 등록)이 되어 있지 않아 보낼 수 없습니다.
          </p>
        )}
          </div>
        )}
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="mr-2 text-[0.82rem] font-bold">2. 받는 사람</div>
          <button type="button" className={tabCls(mode === "reservations")} onClick={() => setMode("reservations")}>
            예약 환자 선택
          </button>
          <button type="button" className={tabCls(mode === "numbers")} onClick={() => setMode("numbers")}>
            번호 직접 입력
          </button>
        </div>

        {mode === "reservations" ? (
          <div>
            <p className="mb-2 text-[0.76rem] text-[var(--ink-soft)]">
              확정된 예약 중에서 고르세요. 받는 분마다 <b>본인 예약의 날짜·시간</b>이 자동으로 들어갑니다.
              {templateKey === "reminder_d1" && " 이 템플릿은 내일 예약만 선택할 수 있어요."}
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.76rem]">
              <button
                type="button"
                onClick={() => setPicked(new Set(eligibleList.map((r) => r.id)))}
                className="rounded-lg border border-[var(--line)] px-2.5 py-1 font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)]"
              >
                선택 가능한 예약 모두 선택
              </button>
              <button
                type="button"
                onClick={() => setPicked(new Set())}
                className="rounded-lg border border-[var(--line)] px-2.5 py-1 font-semibold text-[var(--ink-soft)]"
              >
                선택 해제
              </button>
              <span className="text-[var(--ink-soft)]">
                선택 <b className="font-[family-name:var(--font-mono-kr)]">{pickedEligible.length}</b>명
              </span>
            </div>

            <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[var(--line)]">
              {reservations === null ? (
                <div className="py-6 text-center text-[0.8rem] text-[var(--ink-soft)]">불러오는 중…</div>
              ) : reservations.length === 0 ? (
                <div className="py-6 text-center text-[0.8rem] text-[var(--ink-soft)]">앞으로 예정된 확정 예약이 없습니다.</div>
              ) : (
                reservations.map((r) => {
                  const ok = eligible(r);
                  const done = r.sent.includes(templateKey);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-2.5 border-b border-[var(--line)] px-3 py-2.5 last:border-b-0 ${
                        ok ? "cursor-pointer hover:bg-[var(--accent-soft)]" : "cursor-not-allowed opacity-45"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!ok || sending}
                        checked={ok && picked.has(r.id)}
                        onChange={() => togglePick(r.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-[0.82rem]">
                          <b>{r.name}</b>
                          <span className="font-[family-name:var(--font-mono-kr)] text-[0.74rem] text-[var(--ink-soft)]">
                            {r.phoneMasked}
                          </span>
                          <span className="text-[0.76rem] text-[var(--ink-soft)]">
                            {r.dateLabel} {r.timeLabel}
                          </span>
                          {r.isTomorrow && (
                            <span className="rounded-full bg-[var(--st-pending-soft)] px-1.5 py-0.5 text-[0.64rem] font-bold text-[var(--st-pending)]">
                              내일
                            </span>
                          )}
                          {done && (
                            <span className="rounded-full bg-[var(--success-soft)] px-1.5 py-0.5 text-[0.64rem] font-bold text-[var(--success)]">
                              이미 발송됨
                            </span>
                          )}
                        </div>
                        <div className="mt-1 rounded-[3px_10px_10px_10px] bg-[#fee500] px-2.5 py-1.5 text-[0.76rem] leading-[1.5] text-[#3c1e1e]">
                          {reservationPreview(r)}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(isText ? [] : template.variables).map((v) => (
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
                {manualPreview}
              </div>
              <p className="mt-1.5 text-[0.72rem] text-[var(--ink-soft)]">모든 받는 사람에게 같은 문구가 갑니다.</p>
            </div>

            <div>
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
                          onClick={() => setText((prev) => [prev.trim(), p.phone].filter(Boolean).join("\n"))}
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
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-4">
        <div className="mb-2 text-[0.82rem] font-bold">3. 확인 후 발송</div>
        <label className="flex items-start gap-2 text-[0.8rem] leading-[1.6]">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            받는 분이 이 안내를 받을 수 있는 환자(예약·진료 관련 안내 대상)임을 확인했습니다. 홍보·이벤트 같은
            광고성 내용은 이 화면으로 보낼 수 없습니다.
          </span>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[0.86rem] font-bold text-white disabled:opacity-40"
          >
            {sending ? `발송 중… ${progress.done}/${progress.total}` : `${count}명에게 발송`}
          </button>
          {!sending && !canSend && (
            <span className="text-[0.76rem] text-[var(--ink-soft)]">
              {isText && !body.trim()
                ? "보낼 문구를 입력하세요."
                : isText && sender === null
                  ? "문자 발신번호 설정이 필요합니다."
                  : isText && textInvalid
                    ? "문구를 확인하세요."
                    : !isText && !available
                      ? "발송 설정이 필요한 템플릿입니다."
                      : mode === "numbers" && !allFilled
                  ? "템플릿 변수를 모두 입력하세요."
                  : count === 0
                    ? mode === "reservations"
                      ? "받는 예약 환자를 선택하세요."
                      : "받는 사람을 추가하세요."
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
                {result.failed.slice(0, 50).map((f, i) => (
                  <li key={`${f.phone}-${i}`}>
                    {maskPhone(f.phone)} — {f.reason}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[0.74rem] text-[var(--ink-soft)]">
              {isText
                ? "최종 도착 여부는 솔라피 발송 내역에서 확인하세요."
                : "알림톡 수신이 불가능한 번호는 문자(SMS)로 대신 나가며, 최종 도착 여부는 솔라피 발송 내역에서 확인하세요."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
