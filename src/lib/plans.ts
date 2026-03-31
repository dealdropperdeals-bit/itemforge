export const PLAN_CODES = {
  starter: "launch-starter",
  growth: "launch-growth",
  pro: "launch-pro",
} as const;

export const PLAN_LABELS: Record<(typeof PLAN_CODES)[keyof typeof PLAN_CODES], string> = {
  [PLAN_CODES.starter]: "Starter",
  [PLAN_CODES.growth]: "Growth",
  [PLAN_CODES.pro]: "Pro",
};

export const PLAN_CREDITS: Record<(typeof PLAN_CODES)[keyof typeof PLAN_CODES], number> = {
  [PLAN_CODES.starter]: 150,
  [PLAN_CODES.growth]: 600,
  [PLAN_CODES.pro]: 1500,
};
