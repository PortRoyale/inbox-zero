"use client";

import { PLAN_PRESET_KEY } from "@/lib/plan/storage";
import { paths } from "@/lib/paths";

export function StartPlanButton({ industry, label = "Start my security plan", className = "btn btn-primary" }: { industry?: string; label?: string; className?: string }) {
  return (
    <a
      className={className}
      href={paths.plan}
      onClick={() => {
        try {
          if (industry) localStorage.setItem(PLAN_PRESET_KEY, industry);
        } catch {
          // The plan still opens without the preset.
        }
      }}
    >
      {label}
    </a>
  );
}
