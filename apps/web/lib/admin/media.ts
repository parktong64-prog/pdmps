"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "procedure-media";
const MAX_SIZE = 50 * 1024 * 1024; // 50MB (버킷 설정과 동일)

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function extFromType(type: string) {
  return EXT_BY_TYPE[type] ?? type.split("/")[1] ?? "bin";
}

export type StepMediaType = "image" | "video";

export type ProcedureStep = {
  id: string;
  step_order: number;
  title: string;
  description: string;
  media_url: string | null;
  media_type: StepMediaType | null;
};

export async function getProcedureSteps(): Promise<ProcedureStep[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("procedure_steps")
    .select("id, step_order, title, description, media_url, media_type")
    .order("step_order", { ascending: true });
  return data ?? [];
}

async function uploadFile(file: File, pathPrefix: string) {
  if (file.size === 0) return { ok: false as const, error: "파일을 선택해주세요." };
  if (file.size > MAX_SIZE) return { ok: false as const, error: "파일 용량은 50MB 이하만 가능합니다." };

  const mediaType: StepMediaType | null = file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("image/")
      ? "image"
      : null;
  if (!mediaType) return { ok: false as const, error: "이미지 또는 동영상 파일만 업로드할 수 있습니다." };

  const supabase = createAdminClient();
  const ext = extFromType(file.type);
  const path = `${pathPrefix}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(arrayBuffer), {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return { ok: false as const, error: "업로드에 실패했습니다." };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true as const, url: pub.publicUrl, mediaType, supabase };
}

export async function uploadStepMedia(stepId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "파일을 선택해주세요." };

  const result = await uploadFile(file, `steps/${stepId}`);
  if (!result.ok) return result;

  const { error } = await result.supabase
    .from("procedure_steps")
    .update({ media_url: result.url, media_type: result.mediaType, updated_at: new Date().toISOString() })
    .eq("id", stepId);
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  return { ok: true, url: result.url, mediaType: result.mediaType };
}

export async function removeStepMedia(stepId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("procedure_steps")
    .update({ media_url: null, media_type: null, updated_at: new Date().toISOString() })
    .eq("id", stepId);
  return { ok: !error };
}

export async function uploadMainVideo(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "파일을 선택해주세요." };
  if (!file.type.startsWith("video/")) return { ok: false, error: "동영상 파일만 업로드할 수 있습니다." };

  const supabase = createAdminClient();
  const { data: video } = await supabase.from("procedure_videos").select("id").eq("is_active", true).limit(1).maybeSingle();
  if (!video) return { ok: false, error: "등록된 영상 항목이 없습니다." };

  const result = await uploadFile(file, `intro/${video.id}`);
  if (!result.ok) return result;

  const title = file.name.replace(/\.[^.]+$/, "");
  const { error } = await result.supabase.from("procedure_videos").update({ video_url: result.url, title }).eq("id", video.id);
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  return { ok: true, url: result.url, title };
}
