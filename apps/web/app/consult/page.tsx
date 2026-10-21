import type { Metadata } from "next";
import { getActiveVideo } from "@/lib/admin/actions";
import ConsultClient from "./ConsultClient";

export const metadata: Metadata = {
  title: "안면거상술(페이스리프트) 상담 신청 | PDM 박동만성형외과",
  description: "PDM 박동만성형외과의 안면거상술(페이스리프트) 상담 신청 페이지입니다. 상담 안내 영상을 확인하고 상담 신청을 진행하세요.",
  openGraph: {
    title: "안면거상술(페이스리프트) 상담 신청 | PDM 박동만성형외과",
    description: "상담 안내 영상을 확인하고 PDM 박동만성형외과의 안면거상술(페이스리프트) 상담을 신청하세요.",
    url: "/consult",
    siteName: "PDM 박동만성형외과",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "안면거상술(페이스리프트) 상담 신청 | PDM 박동만성형외과",
    description: "상담 안내 영상을 확인하고 안면거상술(페이스리프트) 상담을 신청하세요.",
    images: ["/og-image.jpg"],
  },
};

// 관리자가 영상을 업로드하면 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function ConsultPage() {
  const video = await getActiveVideo();
  return <ConsultClient video={video} />;
}
