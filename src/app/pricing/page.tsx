import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { faqNotes } from "@/content/faq";
import { Pricing } from "@/components/sales/Pricing";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPage, softwareApp } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Pricing: CRA compliance from €0",
  description: "Free CRA tools, plans from €149 a month, and a guided package from €6,000. Cost calculator and EU SME co-funding of up to €30,000.",
  alternates: { canonical: "/pricing/" },
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader current="pricing" />
      <main>
        <Pricing />
        <JsonLd data={softwareApp()} />
        <JsonLd data={faqPage(faqNotes)} />
      </main>
    </>
  );
}
