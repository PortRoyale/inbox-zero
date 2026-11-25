import type { Metadata } from "next";
import { ReleaseGate } from "@/components/ReleaseGate";

export const metadata: Metadata = {
  title: "Release security gate",
  description: "Decide which security testing each release needs based on what changed, not on the version label.",
};

export default function ReleaseGatePage() {
  return <ReleaseGate />;
}
