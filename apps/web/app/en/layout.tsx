import type { Metadata } from "next";
import { SiteFooter } from "../SiteFooter";

// 영어(해외 환자용) 화면 공통 — 모든 /en 페이지 아래에 영어 푸터를 붙인다.
export const metadata: Metadata = {
  title: "Facelift Consultation Booking | PDM Plastic Surgery (Seoul)",
  description:
    "Book a facelift consultation with Dr. Park Dong-man at PDM Plastic Surgery in Seoul. Watch the guide video and reserve your appointment online.",
  alternates: { canonical: "/en", languages: { ko: "/", en: "/en" } },
  openGraph: {
    title: "Facelift Consultation Booking | PDM Plastic Surgery (Seoul)",
    description: "Watch the guide video and book a facelift consultation with Dr. Park Dong-man.",
    url: "/en",
    siteName: "PDM Plastic Surgery",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div lang="en" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter lang="en" />
    </>
  );
}
