import type { Metadata } from "next";
import CheckoutClient from "../../../consult/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Your Information & Deposit | PDM Plastic Surgery",
  robots: { index: false },
};

export default function EnCheckoutPage() {
  return <CheckoutClient lang="en" />;
}
