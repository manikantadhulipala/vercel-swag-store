import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// The cart is personal to each visitor, so it stays out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
