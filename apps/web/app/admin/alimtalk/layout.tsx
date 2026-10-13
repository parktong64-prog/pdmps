// 이 화면의 서버 액션(알림톡 발송)이 솔라피 응답을 기다리는 동안 서버가 먼저 끊기지 않도록
// 실행 시간 상한을 넉넉히 둔다.
export const maxDuration = 60;

export default function AlimtalkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
