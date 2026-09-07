import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR, IBM_Plex_Mono } from "next/font/google";
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

const SITE_URL = "https://pdmps-hazel.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PDMPS | Face Lift 전문",
  description: "Face Lift 전문 · 박동만 원장 상담·예약 서비스",
  // 카카오톡 등에 링크를 보낼 때 썸네일이 있는 카드로 표시되도록 Open Graph 메타를 채운다.
  openGraph: {
    title: "PDMPS | Face Lift 전문",
    description: "AI 시뮬레이션으로 미리 확인하고, 지금 바로 상담 예약하세요.",
    url: SITE_URL,
    siteName: "PDMPS",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "PDMPS Face Lift 전문" }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDMPS | Face Lift 전문",
    description: "AI 시뮬레이션으로 미리 확인하고, 지금 바로 상담 예약하세요.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${notoSerifKR.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
