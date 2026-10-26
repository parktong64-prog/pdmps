import type { Metadata } from "next";
import { getActiveVideo } from "@/lib/admin/actions";
import ConsultClient from "../../consult/ConsultClient";

export const metadata: Metadata = {
  title: "About the Facelift Surgery | PDM Plastic Surgery",
  description: "Watch the facelift guide video from PDM Plastic Surgery in Seoul, then book your consultation with Dr. Park Dong-man.",
  alternates: { canonical: "/en/consult" },
};

// 관리자가 영상을 업로드하면 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function EnConsultPage() {
  const video = await getActiveVideo("en");
  return <ConsultClient video={video} lang="en" />;
}
