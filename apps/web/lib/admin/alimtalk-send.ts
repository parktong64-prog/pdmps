"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAlimtalk } from "@/lib/notifications/alimtalk";
import { MANUAL_TEMPLATES } from "@/lib/notifications/manual-templates";
import { normalizePhone } from "@/lib/phone-extract";

// 한 번의 서버 호출에서 처리할 최대 건수 (서버 실행 시간 제한을 넘지 않게 화면에서 나눠서 보낸다).
const MAX_PER_CALL = 10;
const MAX_VALUE_LEN = 40;
const CONCURRENCY = 5;

// 서버 액션은 주소만 알면 바깥에서도 호출될 수 있으므로, 발송처럼 비용이 드는 작업은
// 미들웨어에만 맡기지 않고 여기서 관리자 로그인을 한 번 더 확인한다.
async function requireAdmin(): Promise<{ ok: true; email: string } | { ok: false }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { ok: true, email: data.user.email ?? "" } : { ok: false };
}

export type ManualTemplateInfo = { key: string; available: boolean };

/** 어떤 템플릿이 실제로 발송 가능한지(템플릿 ID가 등록되어 있는지) 알려준다. */
export async function getTemplateAvailability(): Promise<ManualTemplateInfo[]> {
  if (!(await requireAdmin()).ok) return [];
  return MANUAL_TEMPLATES.map((t) => ({ key: t.key, available: !!process.env[t.envVar] }));
}

export type PatientOption = { id: string; name: string; phone: string };

/** 보관 처리되지 않은 환자 목록 (발송 대상 선택용). */
export async function listPatientsForSend(): Promise<PatientOption[]> {
  if (!(await requireAdmin()).ok) return [];
  const { data } = await createAdminClient()
    .from("patients")
    .select("id, name, phone")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({ id: p.id as string, name: p.name as string, phone: p.phone as string }));
}

export type BatchResult = { ok: boolean; sent: number; failed: { phone: string; reason: string }[]; error?: string };

export async function sendAlimtalkBatch(input: {
  templateKey: string;
  variables: Record<string, string>;
  phones: string[];
}): Promise<BatchResult> {
  if (!(await requireAdmin()).ok) return { ok: false, sent: 0, failed: [], error: "로그인이 필요합니다." };

  const template = MANUAL_TEMPLATES.find((t) => t.key === input.templateKey);
  if (!template) return { ok: false, sent: 0, failed: [], error: "알 수 없는 템플릿입니다." };
  const templateId = process.env[template.envVar];
  if (!templateId) return { ok: false, sent: 0, failed: [], error: "이 템플릿은 아직 발송 설정이 되어 있지 않습니다." };

  const variables: Record<string, string> = {};
  for (const v of template.variables) {
    const value = (input.variables[v.name] ?? "").trim();
    if (!value) return { ok: false, sent: 0, failed: [], error: `"${v.label}" 값을 입력해주세요.` };
    if (value.length > MAX_VALUE_LEN || /[\r\n]/.test(value)) {
      return { ok: false, sent: 0, failed: [], error: `"${v.label}" 값이 너무 길거나 줄바꿈이 있습니다.` };
    }
    variables[`#{${v.name}}`] = value;
  }

  const phones = [...new Set(input.phones.map((p) => normalizePhone(p)).filter((p): p is string => !!p))];
  if (phones.length === 0) return { ok: false, sent: 0, failed: [], error: "보낼 번호가 없습니다." };
  if (phones.length > MAX_PER_CALL) return { ok: false, sent: 0, failed: [], error: "한 번에 보낼 수 있는 건수를 넘었습니다." };

  const failed: { phone: string; reason: string }[] = [];
  let sent = 0;
  let next = 0;
  async function worker() {
    while (next < phones.length) {
      const phone = phones[next++];
      const res = await sendAlimtalk({ to: phone, templateId: templateId!, variables });
      if (res.ok) sent++;
      else failed.push({ phone, reason: res.error.slice(0, 120) });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, phones.length) }, worker));
  return { ok: true, sent, failed };
}

/** 발송이 끝난 뒤 요약(누가·언제·무엇을·몇 건)만 남긴다. 받는 사람 번호는 저장하지 않는다. */
export async function recordBroadcast(input: {
  templateKey: string;
  variables: Record<string, string>;
  total: number;
  success: number;
  failed: number;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false };
  const { error } = await createAdminClient().from("alimtalk_broadcasts").insert({
    template_key: input.templateKey,
    variables: input.variables,
    total: input.total,
    success: input.success,
    failed: input.failed,
    sent_by: auth.email,
  });
  return { ok: !error };
}
