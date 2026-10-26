import type { Metadata } from "next";
import ScheduleClient from "../../../consult/schedule/ScheduleClient";

export const metadata: Metadata = {
  title: "Booking Calendar | PDM Plastic Surgery",
  description: "Choose a date and time for your facelift consultation with Dr. Park Dong-man in Seoul.",
  alternates: { canonical: "/en/consult/schedule" },
};

export default function EnSchedulePage() {
  return <ScheduleClient lang="en" />;
}
