// 관리자 화면 "알림톡 발송"에서 고를 수 있는 템플릿 목록.
// 카카오가 이미 승인한 템플릿만 넣는다. 새 템플릿이 승인되면 여기에 항목을 추가하고,
// 승인받은 템플릿 ID를 envVar에 적은 환경변수로 Vercel에 등록하면 된다.
// body의 #{변수명}은 승인받은 문구와 글자 하나까지 같아야 한다.

export type ManualTemplate = {
  key: string;
  name: string;
  /** 템플릿 ID가 들어 있는 환경변수 이름 (서버에서만 읽는다) */
  envVar: string;
  body: string;
  /** 승인된 용도 안내 — 이 목적에 맞는 대상에게만 보내야 한다 */
  purpose: string;
  variables: { name: string; label: string; placeholder: string }[];
};

export const MANUAL_TEMPLATES: ManualTemplate[] = [
  {
    key: "reservation_confirmed",
    name: "예약 확정 안내",
    envVar: "SOLAPI_TEMPLATE_RESERVATION_CONFIRMED",
    body: "[PDMPS] #{날짜} #{시간} Face Lift 상담 예약이 확정되었습니다.",
    purpose: "실제로 예약이 확정된 환자에게 확정 사실을 다시 알릴 때",
    variables: [
      { name: "날짜", label: "날짜", placeholder: "10월 27일(화)" },
      { name: "시간", label: "시간", placeholder: "16:00" },
    ],
  },
  {
    key: "reminder_d1",
    name: "내일 예약 안내",
    envVar: "SOLAPI_TEMPLATE_REMINDER_D1",
    body: "[PDMPS] 내일 #{시간} 예약이 있습니다. 잊지 말고 방문해주세요!",
    purpose: "내일 예약이 실제로 있는 환자에게 방문을 안내할 때",
    variables: [{ name: "시간", label: "시간", placeholder: "16:00" }],
  },
];

export function renderTemplateBody(body: string, values: Record<string, string>) {
  return body.replace(/#\{([^}]+)\}/g, (_, name: string) => values[name]?.trim() || `#{${name}}`);
}
