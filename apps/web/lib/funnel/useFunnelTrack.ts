"use client";

import { useEffect } from "react";
import { trackFunnelEvent } from "./track";

/** 컴포넌트가 처음 마운트될 때 퍼널 단계 방문을 한 번 기록한다. */
export function useFunnelTrack(event: string) {
  useEffect(() => {
    trackFunnelEvent(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
