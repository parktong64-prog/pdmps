import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 임시: 업로드 테스트로 생성된 diag/ 폴더의 테스트 파일들을 정리한다. 확인 후 제거.
export async function GET() {
  const supabase = createAdminClient();
  const { data: files } = await supabase.storage.from("procedure-media").list("diag");
  const paths = (files ?? []).map((f) => `diag/${f.name}`);
  if (paths.length === 0) return NextResponse.json({ ok: true, removed: 0 });
  const { error } = await supabase.storage.from("procedure-media").remove(paths);
  return NextResponse.json({ ok: !error, removed: paths.length, paths });
}
