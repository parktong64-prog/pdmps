import "server-only";

// Solapi를 통한 문자(SMS/LMS) 발송. 알림톡과 달리 미리 승인받은 문구가 필요 없어 자유 문구를 보낼 수 있다.
// 광고성 문자는 수신 동의와 무료수신거부 번호가 필요하므로 이 모듈은 정보성(예약·진료 안내) 용도로만 쓴다.

import { createHmac, randomBytes } from "crypto";

import { SMS_MAX_BYTES, TEXT_MAX_BYTES, smsByteLength } from "./text-utils";

const API_URL = "https://api.solapi.com/messages/v4/send";

function authHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export function senderPhoneMasked(): string | null {
  const raw = process.env.SOLAPI_SENDER_PHONE?.replace(/\D/g, "");
  if (!raw || raw.length < 8) return null;
  return `${raw.slice(0, 3)}-****-${raw.slice(-4)}`;
}

export type SmsResult = { ok: true } | { ok: false; error: string };

export async function sendSms(input: { to: string; text: string }): Promise<SmsResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_PHONE;
  if (!apiKey || !apiSecret || !from) {
    return { ok: false, error: "문자 발송 미설정 (SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_SENDER_PHONE 필요)" };
  }
  const bytes = smsByteLength(input.text);
  if (bytes === 0) return { ok: false, error: "문구가 비어 있습니다." };
  if (bytes > TEXT_MAX_BYTES) return { ok: false, error: "문구가 너무 깁니다." };
  const isLms = bytes > SMS_MAX_BYTES;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader(apiKey, apiSecret) },
      body: JSON.stringify({
        message: {
          to: input.to.replace(/\D/g, ""),
          from: from.replace(/\D/g, ""),
          text: input.text,
          type: isLms ? "LMS" : "SMS",
          ...(isLms ? { subject: "박동만성형외과" } : {}),
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const bodyText = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: `문자 발송 실패 (${res.status}) ${bodyText.slice(0, 300)}` };
    try {
      const body = JSON.parse(bodyText) as { statusCode?: string | number };
      if (body.statusCode !== undefined && !String(body.statusCode).startsWith("2")) {
        return { ok: false, error: `문자 발송 실패 (statusCode ${body.statusCode}) ${bodyText.slice(0, 300)}` };
      }
    } catch {
      // 형식을 알 수 없는 응답은 성공으로 둔다 (알림톡 발송과 같은 원칙).
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? `문자 발송 중 오류: ${err.message}` : "문자 발송 중 오류" };
  }
}
