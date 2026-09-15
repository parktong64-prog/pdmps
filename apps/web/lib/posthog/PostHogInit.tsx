"use client";

import { useEffect } from "react";
import { initPostHogIfProd } from "./client";

/** 루트 레이아웃에 한 번 렌더해서 배포 환경에서만 PostHog을 초기화한다. 화면에는 아무 것도 그리지 않는다. */
export function PostHogInit() {
  useEffect(() => {
    initPostHogIfProd();
  }, []);
  return null;
}
