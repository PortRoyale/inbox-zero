import type { Metadata } from "next";
import { connection } from "next/server";
import { AcceptInvite } from "@/components/app/Auth";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Accept an invite", robots: { index: false, follow: false } };

// Rendered per request so the proxy's CSP nonce reaches every script.
export default async function Page() {
  await connection();
  return (
    <>
      <SiteHeader />
      <main className="wrap auth-main">
        <AcceptInvite />
      </main>
    </>
  );
}
