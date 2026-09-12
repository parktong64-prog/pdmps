import { getProcedureSettings } from "@/lib/admin/actions";
import HomeClient from "./HomeClient";

// 관리자가 가격을 바꾸면 홈 화면에도 바로 반영되어야 하므로 정적 캐싱을 끈다.
export const dynamic = "force-dynamic";

export default async function Home() {
  const procedure = await getProcedureSettings();
  return <HomeClient basePrice={procedure?.base_price ?? 0} />;
}
