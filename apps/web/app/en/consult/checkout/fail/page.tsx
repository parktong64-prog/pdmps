import type { Metadata } from "next";
import FailContent from "../../../../consult/checkout/fail/FailContent";

export const metadata: Metadata = {
  title: "Booking Not Completed | PDM Plastic Surgery",
  robots: { index: false },
};

export default function EnCheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}) {
  return <FailContent searchParams={searchParams} lang="en" />;
}
