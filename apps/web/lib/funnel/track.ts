"use client";

import { trackPostHogEvent } from "@/lib/posthog/client";

const VISITOR_KEY = "pdmpsVisitorId";

/** 이 브라우저(방문자)를 구분하는 익명 ID. 개인정보는 담지 않는다. */
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // localStorage 접근 불가(시크릿 모드 등) — 이번 호출만 쓰고 버릴 임시 ID
    return `anon-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * 퍼널 단계 방문을 기록한다. 실패해도 화면 이용에는 전혀 지장이 없도록
 * 조용히 무시한다 — 통계 수집이 실제 서비스 흐름을 막으면 안 되기 때문.
 * 같은 방문자가 같은 이벤트를 여러 번 발생시켜도(새로고침 등) 한 번만 기록한다.
 *
 * supabase-js 클라이언트 대신 REST에 직접 fetch(keepalive: true)로 보낸다 —
 * 방문자가 이 단계를 보자마자 바로 다음 페이지로 넘어가는 경우가 흔한데,
 * 일반 fetch는 페이지 이동(unload) 시 브라우저가 요청 자체를 취소해버려
 * keepalive 없이는 기록이 자주 유실된다.
 */
export function trackFunnelEvent(event: string) {
  try {
    const dedupeKey = `pdmpsFunnelSeen:${event}`;
    if (sessionStorage.getItem(dedupeKey) === "1") return;
    sessionStorage.setItem(dedupeKey, "1");

    const sessionId = getVisitorId();

    // PostHog에도 같은 이름으로 남겨서 나중에 Funnel 인사이트를 그대로 만들 수 있게 한다.
    // (개발 환경에서는 posthog가 초기화되지 않아 여기서 조용히 무시된다.)
    trackPostHogEvent(event, { session_id: sessionId });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    void fetch(`${url}/rest/v1/funnel_events`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ session_id: sessionId, event }),
    });
  } catch {
    // 추적 실패는 무시
  }
}
