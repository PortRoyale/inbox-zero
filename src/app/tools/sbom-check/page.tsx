import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SbomCheck } from "@/components/tools/Tools";

export const metadata: Metadata = {
  title: "SBOM check: quality and known vulnerabilities",
  description: "Check a CycloneDX or SPDX SBOM against CRA and NTIA minimum elements and the OSV vulnerability database. Scored in your browser; nothing stored.",
  alternates: { canonical: "/tools/sbom-check/" },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="tools" />
      <main>
        <SbomCheck />
      </main>
    </>
  );
}
