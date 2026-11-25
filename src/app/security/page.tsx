import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustCentre } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "Trust centre: how we protect your data",
  description: "Post-quantum encryption at rest, hybrid Ed25519 and ML-DSA-65 signatures, TLS 1.3 with ML-KEM, strict CSP, team isolation and zero trackers.",
  alternates: { canonical: "/security/" },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="security" />
      <main>
        <TrustCentre />
      </main>
    </>
  );
}
