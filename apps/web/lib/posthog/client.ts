"use client";

import posthog from "posthog-js";

let initialized = false;

const ADMIN_BROWSER_KEY = "pdmpsAdminBrowser";

/** 이 브라우저가 관리자(원장님) 접속으로 확인된 적이 있는지 — 있으면 계속 추적을 건너뛴다. */
function isKnownAdminBrowser(): boolean {
  try {
    return localStorage.getItem(ADMIN_BROWSER_KEY) === "1";
  } catch {
    return false;
  }
}

function markAsAdminBrowser() {
  try {
    localStorage.setItem(ADMIN_BROWSER_KEY, "1");
  } catch {
    // 저장 실패해도 이번 세션 옵트아웃은 아래에서 별도로 처리됨
  }
}

/**
 * 배포된(production) 환경에서만, 그리고 관리자 페이지(/admin)가 아닐 때만
 * PostHog을 초기화한다.
 * - `next dev`로 로컬에서 개발할 때는 NODE_ENV가 "development"라 초기화 자체가
 *   안 되고, 이후 trackPostHogEvent 호출도 전부 무시된다.
 * - /admin으로 바로 들어온 경우(원장님 로그인 등)도 애초에 초기화하지 않아,
 *   환자 방문 통계에 관리자 본인의 접속이 섞이지 않는다.
 * - 환자 화면을 보다가 나중에 /admin으로 들어가는 경우를 대비해, PostHogRouteGuard가
 *   실행 중에도 /admin 진입을 감지하면 markAdminBrowserAndOptOut()을 호출한다.
 */
export function initPostHogIfProd() {
  if (initialized) return;
  if (process.env.NODE_ENV !== "production") return;
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) return;
  if (isKnownAdminBrowser()) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    // 방문자 한 명 한 명의 프로필을 만들어야 "이 사람이 어디까지 했는지"를
    // Persons/세션 단위로 볼 수 있다.
    person_profiles: "always",
  });
  initialized = true;
}

/**
 * 환자 화면을 보다가 /admin으로 들어간 경우 호출한다 — 지금부터 이 세션의
 * 추적을 끄고, 이 브라우저를 "관리자 브라우저"로 표시해 다음 방문부터는
 * 아예 초기화되지 않게 한다.
 */
export function markAdminBrowserAndOptOut() {
  markAsAdminBrowser();
  if (initialized) {
    posthog.opt_out_capturing();
  }
}

export function isPostHogEnabled() {
  return initialized;
}

/** 초기화(=production) 상태일 때만 실제로 이벤트를 보낸다. */
export function trackPostHogEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export { posthog };
