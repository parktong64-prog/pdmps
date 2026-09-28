import type { Metadata } from "next";
import { LegalShell, Section } from "../LegalShell";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = { title: "개인정보처리방침 | PDMPS" };

export default function PrivacyPage() {
  const officer = BUSINESS.privacyOfficer;
  return (
    <LegalShell title="개인정보처리방침">
      <Section title="1. 수집하는 개인정보 항목">
        <p>· 예약 시 이용자가 입력하는 정보: 이름, 휴대전화번호</p>
        <p>
          · 결제 정보: 결제수단 정보(카드번호 등)는 결제대행사(토스페이먼츠)가 직접 처리하며 병원은 저장하지 않습니다.
          병원에는 주문번호, 결제 금액, 승인 결과만 기록됩니다.
        </p>
        <p>· 서비스 이용 과정에서 자동 수집: 접속 기록, 방문 페이지, 기기·브라우저 정보, 익명 방문자 식별값</p>
        <p>
          · AI 시뮬레이션에서 선택한 얼굴 사진은 이용자의 기기(브라우저)에서만 처리되며, 병원 서버에 저장되지 않습니다.
        </p>
      </Section>
      <Section title="2. 수집·이용 목적">
        <p>· 상담 예약 접수 및 확정, 예약금 결제 확인</p>
        <p>· 예약 확정·일정 안내(카카오 알림톡, 문자 등)</p>
        <p>· 서비스 이용 통계 분석 및 서비스 개선</p>
      </Section>
      <Section title="3. 보유 및 이용 기간">
        <p>
          수집 목적이 달성되면 지체 없이 파기합니다. 다만 관련 법령에 따라 다음 기간 동안 보관합니다.
        </p>
        <p>· 계약 또는 청약철회, 대금결제 및 재화 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</p>
        <p>· 소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</p>
      </Section>
      <Section title="4. 개인정보 처리 위탁 및 국외 이전">
        <p>병원은 원활한 서비스 제공을 위해 다음과 같이 업무를 위탁합니다.</p>
        <p>· 토스페이먼츠: 예약금 결제 처리</p>
        <p>· 솔라피(카카오 알림톡 발송 대행): 예약 확정 등 안내 메시지 발송 (이름 제외, 휴대전화번호·예약 일시)</p>
        <p>· Supabase, Vercel: 데이터 저장 및 웹사이트 운영 (해외 서버를 이용할 수 있습니다)</p>
        <p>· PostHog: 서비스 이용 통계 분석 (해외 서버를 이용할 수 있습니다)</p>
      </Section>
      <Section title="5. 이용자의 권리">
        <p>
          이용자는 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있으며, 아래 개인정보 보호책임자에게
          연락하시면 지체 없이 조치합니다. 개인정보 수집·이용에 동의하지 않을 권리가 있으나, 동의하지 않으면 예약 서비스를
          이용할 수 없습니다.
        </p>
      </Section>
      <Section title="6. 개인정보의 안전성 확보 조치">
        <p>· 접근 권한 최소화 및 관리자 계정 인증</p>
        <p>· 전송 구간 암호화(HTTPS) 적용</p>
      </Section>
      <Section title="7. 개인정보 보호책임자">
        <p>
          성명: {officer.name} · 이메일: {officer.email}
        </p>
        <p>
          {BUSINESS.name} · {BUSINESS.address} · 전화 {BUSINESS.phone}
        </p>
      </Section>
      <Section title="8. 방침 변경">
        <p>이 방침은 {BUSINESS.policyDate}부터 시행되며, 내용이 변경되면 이 페이지에 공지합니다.</p>
      </Section>
    </LegalShell>
  );
}
