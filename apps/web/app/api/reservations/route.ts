import { NextResponse } from "next/server";
import { createPendingReservation } from "@/lib/payments/toss";

const PHONE_RE = /^01[016789]-\d{3,4}-\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

type Body = {
  name?: string;
  phone?: string;
  email?: string;
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
  const email = body.email?.trim() ?? "";
  const date = body.date ?? "";
  const time = body.time ?? "";

  if (!name) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (!PHONE_RE.test(phone)) return NextResponse.json({ error: "전화번호 형식이 올바르지 않습니다." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    return NextResponse.json({ error: "예약 일시가 올바르지 않습니다." }, { status: 400 });
  }

  const result = await createPendingReservation({ name, phone, email, date, time });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    amount: result.amount,
    orderName: result.orderName,
    customerName: result.customerName,
  });
}
