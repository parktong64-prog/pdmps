import SimulationClient from "./SimulationClient";

// AI 이미지 생성(사진 3장 편집)은 시간이 걸릴 수 있어 Server Action 제한 시간을 늘린다.
export const maxDuration = 60;

export default function SimulationPage() {
  return <SimulationClient />;
}
