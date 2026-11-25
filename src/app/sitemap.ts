import type { MetadataRoute } from "next";
import { countries } from "@/content/countries";
import { guides } from "@/content/guides";
import { industries } from "@/content/industries";
import { indexedCombos } from "@/lib/seo/indexing";
import { revisions, site } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = revisions[revisions.length - 1].date;
  const paths = [
    "/",
    "/plan/",
    "/pricing/",
    "/assessment/",
    "/release-gate/",
    "/tools/",
    "/tools/sbom-check/",
    "/tools/incident-clock/",
    "/security/",
    "/verify-signature/",
    "/terms/",
    "/privacy/",
    "/cra/",
    "/guides/",
    ...industries.map((i) => `/cra/${i.slug}/`),
    ...countries.map((c) => `/cra/countries/${c.slug}/`),
    ...guides.map((g) => `/guides/${g.slug}/`),
    ...[...indexedCombos].map((k) => `/cra/${k}/`),
  ];
  return paths.map((p) => ({ url: `${site.url}${p}`, lastModified }));
}
