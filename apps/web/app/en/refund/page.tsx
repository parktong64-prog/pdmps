import type { Metadata } from "next";
import { LegalShell, Section } from "../../LegalShell";
import { SITE_EN, EN_DEPOSIT_USD } from "@/lib/i18n/patient";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = {
  title: "Refund Policy | PDM Plastic Surgery",
  alternates: { canonical: "/en/refund" },
};

export default function EnRefundPage() {
  return (
    <LegalShell title="Refund Policy" lang="en">
      <Section title="1. Booking deposit">
        <p>
          A booking deposit of USD {EN_DEPOSIT_USD} is paid when you book a Face Lift consultation. Your booking is
          confirmed once the payment is approved.
        </p>
      </Section>
      <Section title="2. Non-refundable">
        <p>
          The deposit is not refunded for any reason on the customer&apos;s side, including cancellation, a change of
          schedule or not showing up (no-show). This is shown on the screen before you pay, and by proceeding with the
          payment you agree to it.
        </p>
      </Section>
      <Section title="3. When a refund is made">
        <p>The deposit is refunded in full in the following cases:</p>
        <p>
          · The consultation could not take place at the booked date and time for reasons on the Clinic&apos;s side (for
          example, the doctor being unavailable or a change in the clinic schedule)
        </p>
        <p>
          · You were charged more than once for the same booking due to a system error, or the payment went through but
          the booking was not confirmed
        </p>
      </Section>
      <Section title="4. How and when refunds are made">
        <p>
          Refunds are made by cancelling the payment through the method you used. Depending on your card issuer or payment
          service, it may take several business days (typically 3 to 7) for the cancellation to appear.
        </p>
      </Section>
      <Section title="5. Contact">
        <p>
          {SITE_EN.name} · Tel {SITE_EN.phone} · Email {BUSINESS.privacyOfficer.email}
        </p>
      </Section>
    </LegalShell>
  );
}
