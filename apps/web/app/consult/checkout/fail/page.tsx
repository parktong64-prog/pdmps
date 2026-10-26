import FailContent from "./FailContent";

export default function CheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}) {
  return <FailContent searchParams={searchParams} lang="ko" />;
}
