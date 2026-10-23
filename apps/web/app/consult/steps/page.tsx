import { getProcedureSteps } from "@/lib/admin/media";
import StepsClient from "./StepsClient";

// 관리자가 단계별 사진/영상을 업로드하면 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function StepsPage() {
  // 숨김 처리한 단계(하나로 합친 영상으로 대체된 단계)는 환자 화면에 보이지 않는다.
  const steps = (await getProcedureSteps()).filter((s) => !s.hidden);
  return <StepsClient steps={steps} />;
}
