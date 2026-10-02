"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/business";

const SHARE_TITLE = "PDMPS | Face Lift 전문";
const SHARE_TEXT = "AI 시뮬레이션으로 미리 확인하고, 지금 바로 상담 예약하세요.";

async function copyLink() {
  try {
    await navigator.clipboard.writeText(SITE_URL);
    return true;
  } catch {
    return false;
  }
}

// 카카오 SDK 대신 기기의 기본 공유창(Web Share API)을 쓴다. 카카오 개발자 설정(도메인 등록 등)에
// 의존하지 않아 링크가 항상 열리고, 카카오톡 대화방에는 이 주소의 대표 이미지·제목으로 미리보기
// 카드가 자동으로 만들어진다. 공유창을 지원하지 않는 환경(대부분의 PC)에서는 링크 복사로 대신한다.
export function KakaoShareButton() {
  const [notice, setNotice] = useState<string | null>(null);

  async function handleShare() {
    setNotice(null);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SITE_URL });
        return;
      } catch (err) {
        // 사용자가 공유창을 그냥 닫은 경우는 아무 안내도 하지 않는다.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setNotice((await copyLink()) ? "링크를 복사했어요. 카카오톡에 붙여넣어 보내주세요." : SITE_URL);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        className="block w-full rounded-[11px] bg-[#FEE500] py-[14px] text-center text-[0.9rem] font-bold text-[#191919] transition-[filter] hover:brightness-[0.97]"
      >
        카카오톡 등으로 공유하기
      </button>
      {notice && <p className="mt-2 text-center text-[0.76rem] break-all text-[var(--ink-soft)]">{notice}</p>}
    </div>
  );
}
