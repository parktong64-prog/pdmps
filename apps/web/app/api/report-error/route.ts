import { NextResponse } from "next/server";
import { sendErrorNotificationEmail } from "@/lib/notifications/email";

/** 클라이언트 에러 바운더리(error.tsx/global-error.tsx)가 잡은 에러를 관리자에게 이메일로 알린다. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.slice(0, 500) : "알 수 없는 에러";
  const digest = typeof body?.digest === "string" ? body.digest.slice(0, 200) : undefined;
  const url = typeof body?.url === "string" ? body.url.slice(0, 500) : undefined;

  await sendErrorNotificationEmail({ message, digest, url });

  return NextResponse.json({ ok: true });
}
