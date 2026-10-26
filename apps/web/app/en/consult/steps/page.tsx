import type { Metadata } from "next";
import { getProcedureSteps } from "@/lib/admin/media";
import StepsClient from "../../../consult/steps/StepsClient";

export const metadata: Metadata = {
  title: "How the Facelift Is Performed | PDM Plastic Surgery",
  description: "See the facelift procedure step by step with Dr. Park Dong-man at PDM Plastic Surgery, Seoul.",
  alternates: { canonical: "/en/consult/steps" },
};

// 관리자가 단계별 사진/영상을 업로드하면 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function EnStepsPage() {
  // 숨김 처리한 단계는 환자 화면에 보이지 않는다 (한국어 화면과 같은 영상을 쓰고 자막만 영어로 보여준다).
  const steps = (await getProcedureSteps()).filter((s) => !s.hidden);
  return <StepsClient steps={steps} lang="en" />;
}
