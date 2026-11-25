import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { AdminPage } from "@/components/app/TeamAccount";
import { requireSessionPage } from "@/server/page-guard";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Page() {
  await requireSessionPage("/admin/");
  return (
    <AppShell current="admin">
      <AdminPage />
    </AppShell>
  );
}
