import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section } from "../../LegalShell";
import { SITE_EN, EN_DEPOSIT_USD } from "@/lib/i18n/patient";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = {
  title: "Terms of Use | PDM Plastic Surgery",
  alternates: { canonical: "/en/terms" },
};

export default function EnTermsPage() {
  return (
    <LegalShell title="Terms of Use" lang="en">
      <Section title="Article 1 (Purpose)">
        <p>
          These terms set out the rights, obligations and responsibilities of {SITE_EN.name} (the &quot;Clinic&quot;) and users
          in connection with the use of the Face Lift consultation and booking service provided by the Clinic (the
          &quot;Service&quot;).
        </p>
      </Section>
      <Section title="Article 2 (What the Service Provides)">
        <p>The Clinic provides the following:</p>
        <p>· Information about the procedure and consultation requests</p>
        <p>· Scheduling an in-person consultation and paying a booking deposit</p>
      </Section>
      <Section title="Article 3 (Information Is Not a Diagnosis)">
        <p>
          Videos and other information on this site are general reference material to help you understand the procedure.
          They do not guarantee any result and do not replace a medical diagnosis. Your actual condition and the
          appropriate method are explained by the doctor in person at your consultation.
        </p>
      </Section>
      <Section title="Article 4 (Booking and Deposit)">
        <p>
          Your booking is confirmed when you choose an available date and time in the Service and pay the booking deposit
          (USD {EN_DEPOSIT_USD}). The deposit is paid through our payment provider (Toss Payments), and a confirmation is shown on
          screen once the payment is approved.
        </p>
      </Section>
      <Section title="Article 5 (Cancellation and Refunds)">
        <p>
          Cancellation and refund of the deposit are governed by the{" "}
          <Link href="/en/refund" className="underline underline-offset-2">
            Refund Policy
          </Link>
          .
        </p>
      </Section>
      <Section title="Article 6 (User Obligations)">
        <p>
          Users must enter their accurate name, email address and phone number, and must not use another person&apos;s
          information or interfere with the operation of the Service.
        </p>
      </Section>
      <Section title="Article 7 (Privacy)">
        <p>
          The Clinic protects users&apos; personal information in accordance with the{" "}
          <Link href="/en/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
      <Section title="Article 8 (Limitation of Liability)">
        <p>
          The Clinic is not responsible when the Service cannot be provided due to force majeure such as natural disasters
          or communication failures. However, if a consultation cannot take place for reasons attributable to the Clinic,
          the deposit will be refunded in accordance with the Refund Policy.
        </p>
      </Section>
      <Section title="Article 9 (Disputes)">
        <p>
          Disputes relating to the use of the Service are governed by applicable law of the Republic of Korea, and the
          competent court is determined under the Korean Civil Procedure Act.
        </p>
      </Section>
      <Section title="Business Information">
        <p>
          {SITE_EN.name} · CEO {SITE_EN.ceo} · Business reg. no. {BUSINESS.bizNo}
        </p>
        <p>
          {SITE_EN.address} · Tel {SITE_EN.phone}
        </p>
      </Section>
    </LegalShell>
  );
}
