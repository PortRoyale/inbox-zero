import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { AccountPage } from "@/components/app/TeamAccount";
import { requireSessionPage } from "@/server/page-guard";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function Page() {
  await requireSessionPage("/app/account/");
  return (
    <AppShell current="account">
      <AccountPage />
    </AppShell>
  );
}
