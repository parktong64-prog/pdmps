import { NextResponse } from "next/server";
import { createUploadTicket, finalizeStepMedia } from "@/lib/admin/media";

// 임시: 서명된 업로드 티켓 발급이 정상 동작하는지 확인용. 확인 후 제거.
export async function GET() {
  const ticket = await createUploadTicket({
    pathPrefix: "diag/test-upload",
    fileName: "test.png",
    contentType: "image/png",
    size: 1000,
  });
  return NextResponse.json(ticket);
}
