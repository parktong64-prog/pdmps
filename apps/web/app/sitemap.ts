import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/business";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/consult", "/terms", "/privacy", "/refund"].map((path) => ({
    url: new URL(path, SITE_URL).href,
  }));
}
