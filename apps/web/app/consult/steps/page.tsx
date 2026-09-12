import { getProcedureSteps } from "@/lib/admin/media";
import StepsClient from "./StepsClient";

// 관리자가 단계별 사진/영상을 업로드하면 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function StepsPage() {
  const steps = await getProcedureSteps();
  return <StepsClient steps={steps} />;
}
