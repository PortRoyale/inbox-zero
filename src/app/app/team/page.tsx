import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { TeamPage } from "@/components/app/TeamAccount";
import { requireSessionPage } from "@/server/page-guard";

export const metadata: Metadata = { title: "Team", robots: { index: false, follow: false } };

export default async function Page() {
  await requireSessionPage("/app/team/");
  return (
    <AppShell current="team">
      <TeamPage />
    </AppShell>
  );
}
