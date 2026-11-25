import type { Metadata } from "next";
import { LegalPage } from "@/components/InfoPages";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Privacy notice", alternates: { canonical: "/privacy/" } };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <LegalPage kind="privacy" />
      </main>
    </>
  );
}
