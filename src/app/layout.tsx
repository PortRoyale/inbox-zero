import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { organization } from "@/lib/seo/jsonld";
import { site } from "@/lib/site";
import "@/design/system.css";
import "@/design/pages.css";
import "@/design/plan.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  openGraph: { siteName: site.name, type: "website" },
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=B612:wght@700&family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,700;1,400&family=Atkinson+Hyperlegible+Mono:wght@400;700&display=swap"
        />
      </head>
      <body>
        {children}
        <SiteFooter />
        <JsonLd data={organization()} />
      </body>
    </html>
  );
}
