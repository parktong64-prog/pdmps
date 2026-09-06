import { getActiveVideo } from "@/lib/admin/actions";
import { getProcedureSteps } from "@/lib/admin/media";
import ConsultClient from "./ConsultClient";

// 관리자가 영상/사진을 업로드하면 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function ConsultPage() {
  const [video, steps] = await Promise.all([getActiveVideo(), getProcedureSteps()]);
  return <ConsultClient video={video} steps={steps} />;
}
