import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, B612 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { organization } from "@/lib/seo/jsonld";
import { site } from "@/lib/site";
import "@/design/system.css";
import "@/design/pages.css";
import "@/design/plan.css";
import "@/design/flair.css";
import "@/design/brand.css";
import "@/design/structure.css";
import "@/design/walkthrough.css";
import "@/design/app.css";

const display = B612({ weight: "700", subsets: ["latin"], variable: "--ff-display", display: "swap" });
const text = Atkinson_Hyperlegible_Next({ subsets: ["latin", "latin-ext"], variable: "--ff-text", display: "swap" });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin", "latin-ext"], variable: "--ff-code", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  openGraph: { siteName: site.name, type: "website" },
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable} ${mono.variable}`}>
      <body>
        {children}
        <SiteFooter />
        <JsonLd data={organization()} />
      </body>
    </html>
  );
}
