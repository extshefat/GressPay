/** Normalize gp_plans.plan_id (e.g. plan_starter) to marketing code (starter) for filters/UI. */
export function planMarketingCode(planId: string | null | undefined): string {
  const raw = (planId || "starter").toLowerCase().trim();
  if (raw.startsWith("plan_")) {
    return raw.slice(5);
  }
  return raw;
}

export function planIdsMatch(
  merchantPlanId: string | null | undefined,
  filterCode: string
): boolean {
  if (filterCode === "all") return true;
  return planMarketingCode(merchantPlanId) === filterCode.toLowerCase();
}
