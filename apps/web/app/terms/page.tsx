import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section } from "../LegalShell";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = { title: "이용약관 | PDMPS" };

export default function TermsPage() {
  return (
    <LegalShell title="이용약관">
      <Section title="제1조 (목적)">
        <p>
          이 약관은 {BUSINESS.name}(이하 &quot;병원&quot;)이 제공하는 Face Lift 상담·예약 서비스(이하 &quot;서비스&quot;)의 이용과
          관련하여 병원과 이용자의 권리·의무 및 책임사항을 정하는 것을 목적으로 합니다.
        </p>
      </Section>
      <Section title="제2조 (서비스의 내용)">
        <p>병원은 다음 서비스를 제공합니다.</p>
        <p>· 시술 안내 및 상담 신청</p>
        <p>· AI 시뮬레이션(참고용 이미지 안내)</p>
        <p>· 방문 상담 일정 예약 및 예약금 결제</p>
      </Section>
      <Section title="제3조 (AI 시뮬레이션 안내)">
        <p>
          AI 시뮬레이션은 이용자의 이해를 돕기 위한 참고 자료이며 실제 시술 결과를 보장하거나 의학적 진단을 대신하지
          않습니다. 정확한 상태 확인과 시술 방법은 방문 상담에서 원장이 직접 안내합니다.
        </p>
      </Section>
      <Section title="제4조 (예약 및 예약금)">
        <p>
          이용자는 서비스에서 예약 가능한 일시를 선택하고 예약금을 결제하면 예약이 확정됩니다. 예약금은 결제대행사(토스페이먼츠)를
          통해 결제되며, 결제 승인 후 예약 확정 안내가 발송됩니다.
        </p>
      </Section>
      <Section title="제5조 (취소 및 환불)">
        <p>
          예약 취소 및 예약금 환불은 <Link href="/refund" className="underline underline-offset-2">환불 규정</Link>에 따릅니다.
        </p>
      </Section>
      <Section title="제6조 (이용자의 의무)">
        <p>이용자는 정확한 이름과 연락처를 입력해야 하며, 타인의 정보를 도용하거나 서비스 운영을 방해해서는 안 됩니다.</p>
      </Section>
      <Section title="제7조 (개인정보 보호)">
        <p>
          병원은 이용자의 개인정보를 <Link href="/privacy" className="underline underline-offset-2">개인정보처리방침</Link>에 따라
          보호합니다.
        </p>
      </Section>
      <Section title="제8조 (책임의 제한)">
        <p>
          병원은 천재지변, 통신 장애 등 불가항력으로 서비스를 제공할 수 없는 경우 책임을 지지 않습니다. 다만 병원의 귀책
          사유로 상담이 진행되지 못한 경우에는 환불 규정에 따라 예약금을 환불합니다.
        </p>
      </Section>
      <Section title="제9조 (분쟁 해결)">
        <p>서비스 이용과 관련한 분쟁은 관련 법령에 따르며, 관할 법원은 민사소송법에 따릅니다.</p>
      </Section>
      <Section title="사업자 정보">
        <p>
          {BUSINESS.name} · 대표 {BUSINESS.ceo} · 사업자등록번호 {BUSINESS.bizNo}
        </p>
        <p>
          {BUSINESS.address} · 전화 {BUSINESS.phone}
        </p>
      </Section>
    </LegalShell>
  );
}
