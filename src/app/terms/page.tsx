import type { Metadata } from "next";
import { LegalPage } from "@/components/InfoPages";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms/" } };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <LegalPage kind="terms" />
      </main>
    </>
  );
}
