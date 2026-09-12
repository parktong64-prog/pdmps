import { getActiveVideo } from "@/lib/admin/actions";
import ConsultClient from "./ConsultClient";

// 관리자가 영상을 업로드하면 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function ConsultPage() {
  const video = await getActiveVideo();
  return <ConsultClient video={video} />;
}
