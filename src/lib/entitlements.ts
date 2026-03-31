import type { SubscriptionPlan, SubscriptionStatus, UserSubscription } from "@prisma/client";

type SubscriptionWithPlan = UserSubscription & {
  plan: SubscriptionPlan;
};

const ACTIVE_STATES: SubscriptionStatus[] = ["ACTIVE", "TRIALING"];

export function resolveEntitlements(subscription?: SubscriptionWithPlan | null) {
  if (!subscription || !ACTIVE_STATES.includes(subscription.status)) {
    return {
      canAccessApp: false,
      canUseAi: false,
      includedCredits: 0,
    };
  }

  return {
    canAccessApp: true,
    canUseAi: true,
    includedCredits: subscription.plan.includedCredits,
  };
}
