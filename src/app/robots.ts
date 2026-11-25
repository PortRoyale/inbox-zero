import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // Signed-in pages and the API are never useful in search results.
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/admin/", "/api/", "/verify/", "/reset/", "/invite/"] }], sitemap: `${site.url}/sitemap.xml` };
}
