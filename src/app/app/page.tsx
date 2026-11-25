import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { Dashboard } from "@/components/app/Dashboard";
import { requireSessionPage } from "@/server/page-guard";

export const metadata: Metadata = { title: "Products", robots: { index: false, follow: false } };

export default async function Page() {
  await requireSessionPage("/app/");
  return (
    <AppShell current="products">
      <Dashboard />
    </AppShell>
  );
}
