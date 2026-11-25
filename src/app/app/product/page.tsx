import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { ProductWorkspace } from "@/components/app/ProductWorkspace";
import { requireSessionPage } from "@/server/page-guard";

export const metadata: Metadata = { title: "Product", robots: { index: false, follow: false } };

export default async function Page() {
  await requireSessionPage("/app/");
  return (
    <AppShell current="products">
      <ProductWorkspace />
    </AppShell>
  );
}
