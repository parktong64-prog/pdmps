import { NextResponse } from "next/server";
import { createPendingReservation } from "@/lib/payments/toss";

const PHONE_RE = /^01[016789]-\d{3,4}-\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 해외 번호: 국가번호 포함 숫자 8~15자리 (+, 공백, 하이픈, 괄호 허용)
const INTL_PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;

/** 서버가 한국어로 돌려주는 대표 오류를 영어 화면용으로 바꾼다. */
function englishError(message: string) {
  if (message.includes("마감") || message.includes("예약할 수 없는 시간")) return "That time is no longer available. Please choose another time.";
  if (message.includes("지난 시간")) return "That time has already passed. Please choose another time.";
  if (message.includes("휴진")) return "The clinic is closed on that day. Please choose another date.";
  if (message.includes("일시")) return "The date or time is not valid.";
  return "Something went wrong while booking. Please try again.";
}

type Body = {
  name?: string;
  phone?: string;
  email?: string;
  lang?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
};

/**
 * 결제 전 단계: 슬롯을 잠깐 선점(held)하고 reservations를 'pending_payment'로 만든다.
 * 클라이언트는 응답으로 받은 orderId/amount로 토스 결제창을 연다.
 * 결제 승인은 /consult/checkout/success 에서 처리한다.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const date = body.date ?? "";
  const time = body.time ?? "";
  const lang = body.lang === "en" ? "en" : "ko";
  const email = body.email?.trim() ?? "";

  if (!name) return NextResponse.json({ error: lang === "en" ? "Please enter your name." : "이름을 입력해주세요." }, { status: 400 });
  if (lang === "en") {
    const digits = phone.replace(/\D/g, "");
    if (!INTL_PHONE_RE.test(phone) || digits.length < 8 || digits.length > 15) {
      return NextResponse.json({ error: "Please enter a valid phone number with country code." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 100) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
  } else if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "전화번호 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    return NextResponse.json({ error: "예약 일시가 올바르지 않습니다." }, { status: 400 });
  }

  const result = await createPendingReservation({ name, phone, date, time, lang, email });
  if (!result.ok) {
    return NextResponse.json({ error: lang === "en" ? englishError(result.error) : result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    amount: result.amount,
    currency: result.currency,
    orderName: result.orderName,
    customerName: result.customerName,
  });
}
