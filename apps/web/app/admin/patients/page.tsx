"use client";

import { useEffect, useState } from "react";
import { StatusPill, type StatusKey } from "@/lib/admin/status";
import { getPatientsList, getPatientDetail, type PatientListRow, type PatientDetail } from "@/lib/admin/actions";

function maskPhone(phone: string) {
  const parts = phone.split("-");
  if (parts.length !== 3) return phone;
  return `${parts[0]}-****-${parts[2]}`;
}

const RES_STATUS_KEY: Record<PatientDetail["reservationList"][number]["status"], StatusKey> = {
  confirmed: "done",
  pending: "pending",
  cancelled: "cancel",
};

type Tab = "intake" | "reservations" | "payments" | "photos";
const TABS: { key: Tab; label: string }[] = [
  { key: "intake", label: "문진표 · AI 분석" },
  { key: "reservations", label: "예약 이력" },
  { key: "payments", label: "결제 이력" },
  { key: "photos", label: "첨부 사진" },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [tab, setTab] = useState<Tab>("intake");

  useEffect(() => {
    getPatientsList().then(setPatients);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getPatientDetail(selectedId).then(setDetail);
  }, [selectedId]);

  if (patients === null) {
    return <div className="py-10 text-center text-[0.84rem] text-[var(--ink-soft)]">불러오는 중…</div>;
  }

  if (!selectedId) {
    return (
      <div>
        <div className="mb-6 flex items-end justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">환자 관리</h1>
          <div className="text-[0.8rem] text-[var(--ink-soft)]">전체 {patients.length}명</div>
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          {patients.length === 0 ? (
            <div className="py-7 text-center text-[0.82rem] text-[var(--ink-soft)]">등록된 환자가 없습니다.</div>
          ) : (
            <table className="w-full min-w-[480px] border-collapse text-[0.82rem]">
              <thead>
                <tr>
                  {["환자", "전화번호", "상담", "예약", "최근 활동"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-[var(--line)] px-2.5 pb-2.5 text-left text-[0.7rem] font-semibold tracking-[0.03em] text-[var(--ink-soft)] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      setTab("intake");
                    }}
                    className="cursor-pointer hover:bg-[var(--accent-soft)]"
                  >
                    <td className="border-b border-[var(--line)] px-2.5 py-3 font-semibold">
                      {p.name}
                      {p.needsReview && (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--st-review-soft)] px-1.5 py-0.5 text-[0.64rem] font-bold text-[var(--st-review)]">
                          AI 확인
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[var(--line)] px-2.5 py-3">{maskPhone(p.phone)}</td>
                    <td className="border-b border-[var(--line)] px-2.5 py-3">{p.visits}회</td>
                    <td className="border-b border-[var(--line)] px-2.5 py-3">{p.reservations}회</td>
                    <td className="border-b border-[var(--line)] px-2.5 py-3">{p.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        className="mb-4 text-[0.8rem] text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--accent-ink)]"
      >
        ‹ 환자 목록으로
      </button>

      {!detail || detail.id !== selectedId ? (
        <div className="py-10 text-center text-[0.84rem] text-[var(--ink-soft)]">불러오는 중…</div>
      ) : (
        <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
          <div className="mb-[22px] flex items-center gap-4">
            <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-[var(--accent-soft)] text-[1.05rem] font-bold text-[var(--accent-ink)]">
              {detail.name.slice(0, 2)}
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] text-[1.2rem] font-bold">{detail.name}</div>
              <div className="mt-0.5 text-[0.8rem] text-[var(--ink-soft)]">{maskPhone(detail.phone)}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1 text-[0.68rem] text-[var(--ink-soft)]">
                  상담 {detail.visits}회
                </span>
                <span className="rounded-full border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1 text-[0.68rem] text-[var(--ink-soft)]">
                  예약 {detail.reservationsCount}회
                </span>
                {detail.ai.needsReview && (
                  <span className="rounded-full bg-[var(--st-review-soft)] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--st-review)]">
                    AI 확인 필요
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-[18px] flex flex-wrap gap-5 border-b border-[var(--line)]">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`border-b-2 pb-2.5 text-[0.82rem] font-semibold ${
                  tab === t.key ? "border-[var(--accent)] text-[var(--ink)]" : "border-transparent text-[var(--ink-soft)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "intake" && (
            <div>
              <dl className="mb-5 grid grid-cols-[110px_1fr] gap-x-3.5 gap-y-2.5 text-[0.84rem]">
                <dt className="text-[var(--ink-soft)]">고민 부위</dt>
                <dd className="m-0">{detail.concern}</dd>
                <dt className="text-[var(--ink-soft)]">희망 사항</dt>
                <dd className="m-0">{detail.hope}</dd>
                <dt className="text-[var(--ink-soft)]">기존 시술 이력</dt>
                <dd className="m-0">{detail.history}</dd>
              </dl>
              <div className="rounded-xl border border-[var(--line)] p-4">
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem] font-bold">
                  <span>AI 사진 분석 결과</span>
                  {!detail.ai.hasData ? (
                    <StatusPill status="pending" label="분석 대기중" />
                  ) : detail.ai.needsReview ? (
                    <StatusPill status="review" label="확인필요" />
                  ) : (
                    <StatusPill status="done" label="정상 판정" />
                  )}
                </div>
                {!detail.ai.hasData ? (
                  <div className="py-4 text-center text-[0.78rem] text-[var(--ink-soft)]">
                    아직 업로드된 분석 사진이 없습니다.
                  </div>
                ) : (
                  <>
                    <div className="mb-1 h-2 overflow-hidden rounded-full bg-[var(--page-bg)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${detail.ai.severity}%` }} />
                    </div>
                    <div className="flex justify-between text-[0.72rem] text-[var(--ink-soft)]">
                      <span>경미</span>
                      <b className="font-[family-name:var(--font-mono-kr)] text-[var(--ink)]">
                        {detail.ai.label} · {detail.ai.severity}/100
                      </b>
                      <span>심함</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {detail.ai.areas.map((a) => (
                        <span key={a} className="rounded-full border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1 text-[0.68rem] text-[var(--ink-soft)]">
                          {a}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === "reservations" &&
            (detail.reservationList.length === 0 ? (
              <EmptyRow text="예약 이력이 없습니다." />
            ) : (
              detail.reservationList.map((r, i) => (
                <MiniRow key={i} title="Face Lift" meta={r.when} pill={<StatusPill status={RES_STATUS_KEY[r.status]} label={r.label} />} />
              ))
            ))}

          {tab === "payments" &&
            (detail.paymentList.length === 0 ? (
              <EmptyRow text="결제 이력이 없습니다." />
            ) : (
              detail.paymentList.map((pay, i) => (
                <MiniRow
                  key={i}
                  title={`${pay.type} · ${pay.amount.toLocaleString()}원`}
                  meta={pay.date}
                  pill={<StatusPill status="progress" label={pay.status} />}
                />
              ))
            ))}

          {tab === "photos" &&
            (detail.photos === 0 ? (
              <EmptyRow text="첨부된 사진이 없습니다." />
            ) : (
              <div>
                <div className="grid grid-cols-4 gap-2.5">
                  {Array.from({ length: detail.photos }).map((_, i) => (
                    <div
                      key={i}
                      className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-[var(--page-bg)] text-[0.66rem] text-[var(--ink-soft)]"
                    >
                      <span>🔒</span>
                      <span>IMG</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[0.72rem] text-[var(--ink-soft)]">
                  비공개 Storage에 저장되며, 서명된 URL로만 열람할 수 있습니다.
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function MiniRow({ title, meta, pill }: { title: string; meta: string; pill: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] py-2.5 text-[0.82rem] last:border-b-0">
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-[0.7rem] text-[var(--ink-soft)]">{meta}</div>
      </div>
      {pill}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="py-6 text-center text-[0.82rem] text-[var(--ink-soft)]">{text}</div>;
}
