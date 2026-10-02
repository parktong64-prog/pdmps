"use client";

import { useEffect, useRef, useState } from "react";
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

let sdkPromise: Promise<KakaoSdk> | null = null;

function loadKakaoSdk(): Promise<KakaoSdk> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.Kakao) return resolve(window.Kakao);
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error("Kakao SDK not found")));
    script.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(script);
  });
  return sdkPromise;
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
  const readyRef = useRef(false);

  // 팝업 차단을 피하려면 클릭 핸들러 안에서 공유창(window.open)이 기다림 없이 곧바로 열려야
  // 브라우저가 "사용자가 직접 누른 동작"으로 인정한다. SDK 로딩을 클릭 이후로 미루면 그 사이의
  // 지연 때문에 팝업이 차단되므로, 버튼이 화면에 뜨는 즉시 미리 불러와 초기화해둔다.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) return;
    loadKakaoSdk()
      .then((kakao) => {
        if (!kakao.isInitialized()) kakao.init(key);
        readyRef.current = true;
      })
      .catch(() => {});
  }, []);

  function handleShare() {
    setNotice(null);
    const kakao = window.Kakao;
    if (!readyRef.current || !kakao) {
      // 아직 준비되지 않았으면(느린 네트워크 등) 기다리는 사이 팝업이 막히므로 링크 복사로 대신한다.
      void copyLink().then((ok) => setNotice(ok ? "링크를 복사했어요. 카카오톡에 붙여넣어 보내주세요." : SITE_URL));
      return;
    }
    try {
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: "PDMPS | Face Lift 전문",
          description: "AI 시뮬레이션으로 미리 확인하고, 지금 바로 상담 예약하세요.",
          imageUrl: `${SITE_URL}/og-image.jpg`,
          // 그림 크기를 알려주지 않으면 카카오가 정사각형으로 가운데만 잘라서 보여준다.
          imageWidth: 1200,
          imageHeight: 630,
          link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL },
        },
        buttons: [{ title: "상담 예약하기", link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL } }],
      });
    } catch {
      void copyLink().then((ok) => setNotice(ok ? "링크를 복사했어요. 카카오톡에 붙여넣어 보내주세요." : SITE_URL));
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
