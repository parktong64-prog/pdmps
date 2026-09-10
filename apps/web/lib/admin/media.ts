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

function mediaTypeFromContentType(contentType: string): StepMediaType | null {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("image/")) return "image";
  return null;
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

/**
 * 브라우저에서 Supabase Storage로 직접(서버를 거치지 않고) 업로드할 수 있도록
 * 서명된 업로드 URL/토큰을 발급한다.
 * Vercel의 서버 함수는 요청 본문 크기에 자체 제한(약 4.5MB)이 있어서, 영상처럼
 * 큰 파일은 Server Action에 FormData로 통째로 보내면 중간에 실패한다 — 그래서
 * 파일 자체는 브라우저 → Supabase로 바로 올리고, 서버는 "업로드 허가"만 내준다.
 */
export async function createUploadTicket(params: {
  pathPrefix: string;
  fileName: string;
  contentType: string;
  size: number;
}) {
  const { pathPrefix, fileName, contentType, size } = params;
  if (!size || size <= 0) return { ok: false as const, error: "파일을 선택해주세요." };
  if (size > MAX_SIZE) return { ok: false as const, error: "파일 용량은 50MB 이하만 가능합니다." };

  const mediaType = mediaTypeFromContentType(contentType);
  if (!mediaType) return { ok: false as const, error: "이미지 또는 동영상 파일만 업로드할 수 있습니다." };

  const ext = extFromType(contentType) || fileName.split(".").pop() || "bin";
  const path = `${pathPrefix}-${Date.now()}.${ext}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "업로드 준비에 실패했습니다." };

  return { ok: true as const, path, token: data.token, mediaType };
}

/** 브라우저에서 업로드를 마친 뒤, 실제 공개 URL을 계산해 해당 단계에 저장한다. */
export async function finalizeStepMedia(stepId: string, path: string, mediaType: StepMediaType) {
  const supabase = createAdminClient();
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error } = await supabase
    .from("procedure_steps")
    .update({ media_url: pub.publicUrl, media_type: mediaType, updated_at: new Date().toISOString() })
    .eq("id", stepId);
  if (error) return { ok: false, error: "저장에 실패했습니다." };
  return { ok: true, url: pub.publicUrl, mediaType };
}

export async function removeStepMedia(stepId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("procedure_steps")
    .update({ media_url: null, media_type: null, updated_at: new Date().toISOString() })
    .eq("id", stepId);
  return { ok: !error };
}

/** 브라우저에서 메인 안내 영상 업로드를 마친 뒤, 실제 공개 URL을 계산해 저장한다. */
export async function finalizeMainVideo(path: string, fileName: string) {
  const supabase = createAdminClient();
  const { data: video } = await supabase.from("procedure_videos").select("id").eq("is_active", true).limit(1).maybeSingle();
  if (!video) return { ok: false, error: "등록된 영상 항목이 없습니다." };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const title = fileName.replace(/\.[^.]+$/, "");
  const { error } = await supabase.from("procedure_videos").update({ video_url: pub.publicUrl, title }).eq("id", video.id);
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  return { ok: true, url: pub.publicUrl, title };
}
