import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 임시: procedure-media 버킷의 파일 용량 제한을 100MB로 올린다. 확인 후 제거.
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.updateBucket("procedure-media", {
    public: true,
    fileSizeLimit: 100 * 1024 * 1024,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message });

  const { data: bucket } = await supabase.storage.getBucket("procedure-media");
  return NextResponse.json({ ok: true, data, bucket });
}
