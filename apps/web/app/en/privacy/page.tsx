import type { Metadata } from "next";
import { LegalShell, Section } from "../../LegalShell";
import { SITE_EN } from "@/lib/i18n/patient";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = {
  title: "Privacy Policy | PDM Plastic Surgery",
  alternates: { canonical: "/en/privacy" },
};

export default function EnPrivacyPage() {
  const officer = BUSINESS.privacyOfficer;
  return (
    <LegalShell title="Privacy Policy" lang="en">
      <Section title="1. Personal information we collect">
        <p>· Information you enter when booking: name, email address, phone number</p>
        <p>
          · Payment information: payment method details (such as card numbers) are handled directly by the payment provider
          (Toss Payments) and are not stored by the Clinic. The Clinic only records the order number, the amount and the
          approval result.
        </p>
        <p>
          · Collected automatically while you use the Service: access logs, pages visited, device and browser information,
          and an anonymous visitor identifier
        </p>
      </Section>
      <Section title="2. Purpose of collection and use">
        <p>· Receiving and confirming consultation bookings and confirming deposit payments</p>
        <p>· Contacting you about your booking and schedule (by email, phone or message)</p>
        <p>· Analyzing usage statistics and improving the Service</p>
      </Section>
      <Section title="3. Retention period">
        <p>
          We delete personal information without delay once the purpose of collection has been achieved. However, the
          following records are kept for the periods required by law:
        </p>
        <p>
          · Records on contracts, withdrawal of subscription, payment and supply of goods or services: 5 years (Act on the
          Consumer Protection in Electronic Commerce)
        </p>
        <p>
          · Records on consumer complaints or dispute handling: 3 years (Act on the Consumer Protection in Electronic
          Commerce)
        </p>
      </Section>
      <Section title="4. Processors and transfers outside Korea">
        <p>To provide the Service smoothly, the Clinic entrusts the following tasks to third parties:</p>
        <p>· Toss Payments: processing of the booking deposit payment (overseas payments may be routed through PayPal)</p>
        <p>
          · Supabase, Vercel: data storage and website operation (these providers may use servers outside Korea, and your
          information may be transferred and stored there)
        </p>
        <p>· PostHog: usage statistics analysis (may use servers outside Korea)</p>
      </Section>
      <Section title="5. Your rights">
        <p>
          You may request access to, correction of, deletion of, or suspension of the processing of your personal
          information at any time by contacting the privacy officer below, and we will act without delay. You have the
          right to refuse consent to the collection and use of your personal information, but if you do not consent you
          cannot use the booking service.
        </p>
      </Section>
      <Section title="6. Security measures">
        <p>· Minimizing access rights and authenticating administrator accounts</p>
        <p>· Encrypting data in transit (HTTPS)</p>
      </Section>
      <Section title="7. Privacy officer">
        <p>
          Name: {officer.name} · Email: {officer.email}
        </p>
        <p>
          {SITE_EN.name} · {SITE_EN.address} · Tel {SITE_EN.phone}
        </p>
      </Section>
      <Section title="8. Changes to this policy">
        <p>
          This policy is effective from {BUSINESS.policyDateEn}. If its contents change, we will announce the change on
          this page.
        </p>
      </Section>
    </LegalShell>
  );
}
