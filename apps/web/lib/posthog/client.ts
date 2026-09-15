"use client";

import posthog from "posthog-js";

let initialized = false;

/**
 * 배포된(production) 환경에서만 PostHog을 초기화한다.
 * `next dev`로 로컬에서 개발할 때는 NODE_ENV가 "development"라 여기서 그냥
 * 리턴되어 초기화 자체가 안 되고, 이후 trackPostHogEvent 호출도 전부 무시된다 —
 * 즉 로컬 개발 중 발생하는 이벤트는 PostHog에 전혀 기록되지 않는다.
 */
export function initPostHogIfProd() {
  if (initialized) return;
  if (process.env.NODE_ENV !== "production") return;

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

export function isPostHogEnabled() {
  return initialized;
}

/** 초기화(=production) 상태일 때만 실제로 이벤트를 보낸다. */
export function trackPostHogEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export { posthog };
