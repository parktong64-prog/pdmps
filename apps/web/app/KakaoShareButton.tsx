"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/business";

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: { sendDefault: (options: Record<string, unknown>) => void };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

// 카카오 SDK는 공유 버튼을 처음 눌렀을 때만 불러온다 (다른 화면 로딩에 영향 없도록).
function loadKakaoSdk(): Promise<KakaoSdk> {
  return new Promise((resolve, reject) => {
    if (window.Kakao) return resolve(window.Kakao);
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error("Kakao SDK not found")));
    script.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(script);
  });
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(SITE_URL);
    return true;
  } catch {
    return false;
  }
}

export function KakaoShareButton() {
  const [notice, setNotice] = useState<string | null>(null);

  async function handleShare() {
    setNotice(null);
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    try {
      if (!key) throw new Error("NEXT_PUBLIC_KAKAO_JS_KEY 없음");
      const kakao = await loadKakaoSdk();
      if (!kakao.isInitialized()) kakao.init(key);
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: "PDMPS | Face Lift 전문",
          description: "AI 시뮬레이션으로 미리 확인하고, 지금 바로 상담 예약하세요.",
          imageUrl: `${SITE_URL}/og-image.jpg`,
          link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL },
        },
        buttons: [{ title: "상담 예약하기", link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL } }],
      });
    } catch {
      // 카카오 공유를 쓸 수 없는 환경이면 링크 복사로 대신한다.
      setNotice((await copyLink()) ? "링크를 복사했어요. 카카오톡에 붙여넣어 보내주세요." : SITE_URL);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        className="block w-full rounded-[11px] bg-[#FEE500] py-[14px] text-center text-[0.9rem] font-bold text-[#191919] transition-[filter] hover:brightness-[0.97]"
      >
        카카오톡으로 공유하기
      </button>
      {notice && <p className="mt-2 text-center text-[0.76rem] break-all text-[var(--ink-soft)]">{notice}</p>}
    </div>
  );
}
