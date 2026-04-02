export const PLAN_CODES = {
  starter: "launch-starter",
  creator: "launch-creator",
  pro: "launch-pro",
} as const;

export const PLAN_LABELS: Record<(typeof PLAN_CODES)[keyof typeof PLAN_CODES], string> = {
  [PLAN_CODES.starter]: "Starter",
  [PLAN_CODES.creator]: "Creator",
  [PLAN_CODES.pro]: "Pro",
};

export const PLAN_CREDITS: Record<(typeof PLAN_CODES)[keyof typeof PLAN_CODES], number> = {
  [PLAN_CODES.starter]: 100,
  [PLAN_CODES.creator]: 400,
  [PLAN_CODES.pro]: 1200,
};
