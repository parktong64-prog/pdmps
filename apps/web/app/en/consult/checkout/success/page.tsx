import type { Metadata } from "next";
import SuccessContent from "../../../../consult/checkout/success/SuccessContent";

export const metadata: Metadata = {
  title: "Booking Confirmed | PDM Plastic Surgery",
  robots: { index: false },
};

export default function EnCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  return <SuccessContent searchParams={searchParams} lang="en" />;
}
