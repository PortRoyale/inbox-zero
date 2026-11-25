"use client";

import { useEffect, useState } from "react";

export function DaysUntil({ date }: { date: string }) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const msPerDay = 24 * 60 * 60 * 1000;
    setDays(Math.max(0, Math.ceil((new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / msPerDay)));
  }, [date]);

  return <span suppressHydrationWarning>{days === null ? "—" : days.toLocaleString("en")}</span>;
}
