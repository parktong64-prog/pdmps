"use server";

// Solapi를 통한 카카오 알림톡 발송.
// 아직 카카오 채널 연동·템플릿 승인이 끝나지 않아 관련 환경변수가 없으면
// 조용히 아무 것도 하지 않는다 — 알림톡이 설정되지 않았다고 해서
// 예약/결제 흐름 자체가 실패하면 안 되기 때문 (이메일 발송과 동일한 원칙).

import { createHmac, randomBytes } from "crypto";

const API_URL = "https://api.solapi.com/messages/v4/send";

function randomSalt(length = 32) {
  return randomBytes(length).toString("hex").slice(0, length);
}

function buildAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = randomSalt();
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export type AlimtalkResult = { ok: true } | { ok: false; error: string };

/**
 * 카카오 알림톡을 1건 발송한다.
 * 필요 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_PHONE(발신 인증된 번호), SOLAPI_PF_ID(카카오 채널 pfId)
 */
export async function sendAlimtalk(input: {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}): Promise<AlimtalkResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_PHONE;
  const pfId = process.env.SOLAPI_PF_ID;

  if (!apiKey || !apiSecret || !from || !pfId) {
    return { ok: false, error: "알림톡 미설정 (SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_SENDER_PHONE/SOLAPI_PF_ID 환경변수 필요)" };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: buildAuthHeader(apiKey, apiSecret),
      },
      body: JSON.stringify({
        message: {
          to: onlyDigits(input.to),
          from: onlyDigits(from),
          kakaoOptions: {
            pfId,
            templateId: input.templateId,
            variables: input.variables,
            // 알림톡이 실패(미가입/차단 등)하면 문자(SMS)로 자동 대체 발송
            disableSms: false,
          },
        },
      }),
      // Solapi가 응답하지 않으면 예약 확정 페이지 자체가 멈춰버리므로 상한을 둔다.
      signal: AbortSignal.timeout(8000),
    });

    const bodyText = await res.text().catch(() => "");

    if (!res.ok) {
      return { ok: false, error: `알림톡 발송 실패 (${res.status}) ${bodyText.slice(0, 300)}` };
    }

    // HTTP 200이어도 메시지 자체는 거절됐을 수 있어 응답 바디의 statusCode도 확인한다.
    // 형식을 확신할 수 없는 응답은(필드 없음/파싱 실패) 기존처럼 성공으로 처리한다 —
    // 여기서 잘못 실패 처리하면 정상 발송건까지 재시도/오탐 처리될 수 있어서다.
    try {
      const body = JSON.parse(bodyText) as { statusCode?: string };
      if (body.statusCode && !body.statusCode.startsWith("2")) {
        return { ok: false, error: `알림톡 발송 실패 (statusCode ${body.statusCode}) ${bodyText.slice(0, 300)}` };
      }
    } catch {
      // JSON이 아니면 판단할 수 없으니 그냥 성공으로 둔다.
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? `알림톡 발송 중 오류: ${err.message}` : "알림톡 발송 중 오류" };
  }
}

/**
 * 예약 확정 알림톡 (환자에게 발송).
 * 카카오 채널에 템플릿이 승인된 뒤, 그 템플릿 ID를 SOLAPI_TEMPLATE_RESERVATION_CONFIRMED에 등록하면 동작한다.
 * 템플릿 본문의 변수명(#{...})은 실제 승인받은 템플릿과 정확히 일치해야 하므로,
 * 템플릿 승인 후 아래 변수명을 그에 맞게 조정해야 할 수 있다.
 */
export async function sendReservationConfirmedAlimtalk(input: {
  phone: string;
  date: string;
  time: string;
}): Promise<AlimtalkResult> {
  const templateId = process.env.SOLAPI_TEMPLATE_RESERVATION_CONFIRMED;
  if (!templateId) {
    return { ok: false, error: "알림톡 미설정 (SOLAPI_TEMPLATE_RESERVATION_CONFIRMED 환경변수 필요)" };
  }
  return sendAlimtalk({
    to: input.phone,
    templateId,
    variables: {
      "#{날짜}": input.date,
      "#{시간}": input.time,
    },
  });
}
