import SuccessContent from "./SuccessContent";

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  return <SuccessContent searchParams={searchParams} lang="ko" />;
}
