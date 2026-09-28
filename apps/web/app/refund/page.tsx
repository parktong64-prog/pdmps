import type { Metadata } from "next";
import { LegalShell, Section } from "../LegalShell";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = { title: "환불 규정 | PDMPS" };

export default function RefundPage() {
  return (
    <LegalShell title="환불 규정">
      <Section title="1. 예약금">
        <p>Face Lift 상담 예약 시 예약금 50,000원을 결제하며, 결제가 승인되면 예약이 확정됩니다.</p>
      </Section>
      <Section title="2. 환불 불가">
        <p>
          예약금은 고객의 사정에 의한 예약 취소·일정 변경·미방문(노쇼) 등 사유와 관계없이 환불되지 않습니다. 예약금 결제
          전 화면에서 이 내용을 안내하며, 결제를 진행하시면 이에 동의한 것으로 봅니다.
        </p>
      </Section>
      <Section title="3. 환불되는 경우">
        <p>다음의 경우에는 예약금 전액을 환불합니다.</p>
        <p>· 병원 사정(원장 휴진, 진료 일정 변경 등)으로 예약된 일시에 상담이 진행되지 못한 경우</p>
        <p>· 시스템 오류 등으로 같은 예약에 대해 중복 결제되었거나, 결제는 되었으나 예약이 확정되지 않은 경우</p>
      </Section>
      <Section title="4. 환불 방법 및 기간">
        <p>
          환불은 결제하신 수단으로 결제 취소 처리됩니다. 신용카드의 경우 카드사 사정에 따라 취소가 반영되기까지 영업일 기준
          3~7일이 걸릴 수 있습니다.
        </p>
      </Section>
      <Section title="5. 문의">
        <p>
          {BUSINESS.name} · 전화 {BUSINESS.phone} · 이메일 {BUSINESS.privacyOfficer.email}
        </p>
      </Section>
    </LegalShell>
  );
}
