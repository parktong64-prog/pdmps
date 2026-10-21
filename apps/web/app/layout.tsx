import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR, IBM_Plex_Mono } from "next/font/google";
import { PostHogInit } from "@/lib/posthog/PostHogInit";
import { SITE_URL } from "@/lib/business";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "oQkLt9kXuC7foO9A9sPkQEAcGyIJjYznrCAIkoNUi_c",
    other: {
      "naver-site-verification": "022b267cd1763ee1c778aae300170de918f799fa",
    },
  },
  title: "PDM 박동만성형외과 | 안면거상술(페이스리프트) 상담 예약",
  description: "PDM 박동만성형외과의 안면거상술(페이스리프트) 상담 예약 사이트입니다. 상담 안내를 확인하고 박동만 원장 상담을 예약하세요.",
  // 카카오톡 등에 링크를 보낼 때 썸네일이 있는 카드로 표시되도록 Open Graph 메타를 채운다.
  openGraph: {
    title: "PDM 박동만성형외과 | 안면거상술(페이스리프트) 상담 예약",
    description: "PDM 박동만성형외과의 안면거상술(페이스리프트) 상담 안내를 확인하고 상담을 예약하세요.",
    url: SITE_URL,
    siteName: "PDM 박동만성형외과",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "PDM 박동만성형외과 안면거상술(페이스리프트) 상담 예약" }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDM 박동만성형외과 | 안면거상술(페이스리프트) 상담 예약",
    description: "PDM 박동만성형외과의 안면거상술(페이스리프트) 상담 안내를 확인하고 상담을 예약하세요.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${notoSerifKR.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogInit />
        {children}
      </body>
    </html>
  );
}
