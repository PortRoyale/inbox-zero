import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { VerifySignature } from "@/components/tools/Tools";

export const metadata: Metadata = {
  title: "Verify a signed record",
  description: "Check a signed plan revision or evidence export against Readyline's Ed25519 and ML-DSA-65 public keys.",
  alternates: { canonical: "/verify-signature/" },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="tools" />
      <main>
        <VerifySignature />
      </main>
    </>
  );
}
