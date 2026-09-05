"use client";

import { useState } from "react";
import { StatusPill, type StatusKey } from "@/lib/admin/status";

type Reservation = { when: string; status: "confirmed" | "pending" | "cancelled"; label: string };
type Payment = { type: string; amount: number; status: string; date: string };
type Patient = {
  name: string;
  phone: string;
  visits: number;
  reservations: number;
  last: string;
  concern: string;
  hope: string;
  history: string;
  ai: { severity: number; label: string; areas: string[]; needsReview: boolean };
  reservationList: Reservation[];
  paymentList: Payment[];
  photos: number;
};

const PATIENTS: Patient[] = [
  {
    name: "이은지", phone: "010-1234-5678", visits: 3, reservations: 2, last: "09.05",
    concern: "팔자주름, 턱선 처짐", hope: "자연스러운 갸름한 라인, 흉터 최소화", history: "없음",
    ai: { severity: 68, label: "중등도", areas: ["턱선 처짐", "목주름"], needsReview: true },
    reservationList: [{ when: "2026.09.18 14:30", status: "pending", label: "결제대기" }],
    paymentList: [{ type: "예약금", amount: 50000, status: "대기", date: "-" }],
    photos: 3,
  },
  {
    name: "최유리", phone: "010-2222-3333", visits: 2, reservations: 1, last: "09.04",
    concern: "광대 처짐, 이중턱", hope: "작은 얼굴형, 자연스러운 인상", history: "3년 전 실리프팅",
    ai: { severity: 42, label: "경미", areas: ["이중턱"], needsReview: false },
    reservationList: [{ when: "2026.09.18 11:00", status: "confirmed", label: "확정" }],
    paymentList: [{ type: "예약금", amount: 50000, status: "결제완료", date: "09.04" }],
    photos: 3,
  },
  {
    name: "박서연", phone: "010-4444-5555", visits: 1, reservations: 0, last: "09.05",
    concern: "목주름", hope: "흉터 없이 자연스럽게", history: "없음",
    ai: { severity: 55, label: "중등도", areas: ["목주름"], needsReview: false },
    reservationList: [], paymentList: [], photos: 2,
  },
  {
    name: "한소민", phone: "010-6666-7777", visits: 1, reservations: 0, last: "09.04",
    concern: "턱선 처짐", hope: "상담 후 결정", history: "없음",
    ai: { severity: 30, label: "경미", areas: ["턱선 처짐"], needsReview: false },
    reservationList: [], paymentList: [], photos: 1,
  },
  {
    name: "오지훈", phone: "010-8888-1234", visits: 2, reservations: 0, last: "09.04",
    concern: "팔자주름, 목주름", hope: "자연스러운 개선", history: "없음",
    ai: { severity: 71, label: "중등도", areas: ["팔자주름", "목주름"], needsReview: true },
    reservationList: [], paymentList: [], photos: 3,
  },
  {
    name: "배수아", phone: "010-1357-2468", visits: 2, reservations: 1, last: "09.03",
    concern: "턱선 처짐", hope: "작은 얼굴형", history: "없음",
    ai: { severity: 60, label: "중등도", areas: ["턱선 처짐"], needsReview: false },
    reservationList: [{ when: "2026.09.22 11:00", status: "pending", label: "결제대기" }],
    paymentList: [{ type: "예약금", amount: 50000, status: "대기", date: "-" }],
    photos: 2,
  },
  {
    name: "문태현", phone: "010-9876-5432", visits: 1, reservations: 0, last: "09.03",
    concern: "이중턱", hope: "상담 후 결정", history: "없음",
    ai: { severity: 25, label: "경미", areas: ["이중턱"], needsReview: false },
    reservationList: [], paymentList: [], photos: 1,
  },
  {
    name: "강하은", phone: "010-2580-3691", visits: 2, reservations: 1, last: "08.30",
    concern: "목주름, 턱선 처짐", hope: "자연스러운 라인", history: "없음",
    ai: { severity: 58, label: "중등도", areas: ["목주름", "턱선 처짐"], needsReview: false },
    reservationList: [{ when: "2026.08.29 16:00", status: "cancelled", label: "취소" }],
    paymentList: [{ type: "예약금", amount: 50000, status: "환불불가·취소", date: "08.29" }],
    photos: 2,
  },
];

function maskPhone(phone: string) {
  const parts = phone.split("-");
  return `${parts[0]}-****-${parts[2]}`;
}

const RES_STATUS_KEY: Record<Reservation["status"], StatusKey> = {
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
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("intake");

  if (selectedIdx === null) {
    return (
      <div>
        <div className="mb-6 flex items-end justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-[1.4rem] font-bold">환자 관리</h1>
          <div className="text-[0.8rem] text-[var(--ink-soft)]">전체 {PATIENTS.length}명</div>
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
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
              {PATIENTS.map((p, i) => (
                <tr
                  key={p.name}
                  onClick={() => {
                    setSelectedIdx(i);
                    setTab("intake");
                  }}
                  className="cursor-pointer hover:bg-[var(--accent-soft)]"
                >
                  <td className="border-b border-[var(--line)] px-2.5 py-3 font-semibold">
                    {p.name}
                    {p.ai.needsReview && (
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
        </div>
      </div>
    );
  }

  const p = PATIENTS[selectedIdx];

  return (
    <div>
      <button
        type="button"
        onClick={() => setSelectedIdx(null)}
        className="mb-4 text-[0.8rem] text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--accent-ink)]"
      >
        ‹ 환자 목록으로
      </button>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-[18px]">
        <div className="mb-[22px] flex items-center gap-4">
          <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-[var(--accent-soft)] text-[1.05rem] font-bold text-[var(--accent-ink)]">
            {p.name.slice(0, 2)}
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-[1.2rem] font-bold">{p.name}</div>
            <div className="mt-0.5 text-[0.8rem] text-[var(--ink-soft)]">{maskPhone(p.phone)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1 text-[0.68rem] text-[var(--ink-soft)]">
                상담 {p.visits}회
              </span>
              <span className="rounded-full border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1 text-[0.68rem] text-[var(--ink-soft)]">
                예약 {p.reservations}회
              </span>
              {p.ai.needsReview && (
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
              <dd className="m-0">{p.concern}</dd>
              <dt className="text-[var(--ink-soft)]">희망 사항</dt>
              <dd className="m-0">{p.hope}</dd>
              <dt className="text-[var(--ink-soft)]">기존 시술 이력</dt>
              <dd className="m-0">{p.history}</dd>
            </dl>
            <div className="rounded-xl border border-[var(--line)] p-4">
              <div className="mb-2.5 flex items-center justify-between text-[0.78rem] font-bold">
                <span>AI 사진 분석 결과</span>
                {p.ai.needsReview ? (
                  <StatusPill status="review" label="확인필요" />
                ) : (
                  <StatusPill status="done" label="정상 판정" />
                )}
              </div>
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-[var(--page-bg)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${p.ai.severity}%` }} />
              </div>
              <div className="flex justify-between text-[0.72rem] text-[var(--ink-soft)]">
                <span>경미</span>
                <b className="font-[family-name:var(--font-mono-kr)] text-[var(--ink)]">
                  {p.ai.label} · {p.ai.severity}/100
                </b>
                <span>심함</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.ai.areas.map((a) => (
                  <span key={a} className="rounded-full border border-[var(--line)] bg-[var(--page-bg)] px-2.5 py-1 text-[0.68rem] text-[var(--ink-soft)]">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "reservations" &&
          (p.reservationList.length === 0 ? (
            <EmptyRow text="예약 이력이 없습니다." />
          ) : (
            p.reservationList.map((r, i) => (
              <MiniRow key={i} title="Face Lift" meta={r.when} pill={<StatusPill status={RES_STATUS_KEY[r.status]} label={r.label} />} />
            ))
          ))}

        {tab === "payments" &&
          (p.paymentList.length === 0 ? (
            <EmptyRow text="결제 이력이 없습니다." />
          ) : (
            p.paymentList.map((pay, i) => (
              <MiniRow
                key={i}
                title={`${pay.type} · ${pay.amount.toLocaleString()}원`}
                meta={pay.date}
                pill={<StatusPill status="progress" label={pay.status} />}
              />
            ))
          ))}

        {tab === "photos" && (
          <div>
            <div className="grid grid-cols-4 gap-2.5">
              {Array.from({ length: p.photos }).map((_, i) => (
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
        )}
      </div>
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
