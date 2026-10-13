// 문자 직접 작성 기능에서 화면(미리보기)과 서버(발송)가 함께 쓰는 계산 모음. 비밀값 없음.

export const SMS_MAX_BYTES = 90;
export const TEXT_MAX_BYTES = 2000;
export const HOSPITAL_PREFIX = "[박동만성형외과] ";

/** 통신사 기준 길이: 한글·전각 문자는 2바이트, 그 외는 1바이트로 센다. */
export function smsByteLength(text: string): number {
  let n = 0;
  for (const ch of text) n += ch.charCodeAt(0) > 127 ? 2 : 1;
  return n;
}

export const PLACEHOLDERS = ["이름", "날짜", "시간"] as const;

export function hasPlaceholders(text: string) {
  return /\{(이름|날짜|시간)\}/.test(text);
}

/** {이름} {날짜} {시간}을 받는 사람의 값으로 바꾼다. 값이 없으면 자리표시자를 그대로 둔다. */
export function fillPlaceholders(text: string, values: Partial<Record<(typeof PLACEHOLDERS)[number], string>>) {
  return text.replace(/\{(이름|날짜|시간)\}/g, (m, k: (typeof PLACEHOLDERS)[number]) => values[k] ?? m);
}
