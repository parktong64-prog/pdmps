import { getActiveVideo } from "@/lib/admin/actions";
import { getProcedureSteps } from "@/lib/admin/media";
import ConsultClient from "./ConsultClient";

export default async function ConsultPage() {
  const [video, steps] = await Promise.all([getActiveVideo(), getProcedureSteps()]);
  return <ConsultClient video={video} steps={steps} />;
}
