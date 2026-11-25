import type { CraClass } from "@/content/types";

export const DAYS_BY_CLASS: Record<CraClass, number> = { default: 15, "important-1": 25, "important-2": 35, critical: 45 };
export const STARTER_YEAR = 149 * 12;
export const TEAM_YEAR = 499 * 12;
export const GUIDED = 6000;
export const GRANT_RATE = 0.5;
export const GRANT_CAP = 30000;

export function estimateCosts({ products, cls, dayRate, penTest, euSme }: { products: number; cls: CraClass; dayRate: number; penTest: number; euSme: boolean }) {
  const consultingDays = DAYS_BY_CLASS[cls] * products;
  const outsourced = consultingDays * dayRate + penTest * products;
  const subscription = products > 1 ? TEAM_YEAR : STARTER_YEAR;
  const withUs = GUIDED + subscription + penTest * products;
  const grant = (cost: number) => (euSme ? Math.min(cost * GRANT_RATE, GRANT_CAP) : 0);
  return { consultingDays, outsourced, outsourcedNet: outsourced - grant(outsourced), withUs, withUsNet: withUs - grant(withUs), subscription, grantOnUs: grant(withUs) };
}
