// Self-hosted fork: there is no billing. Every team runs on the full feature
// set, so `usePlan()` answers the same for everyone. The return shape is kept
// so the many call sites that only ask "may I?" keep working unchanged.

export type BasePlan = "business";

const PLAN: BasePlan = "business";

export function usePlan(_options: { withDiscount?: boolean } = {}) {
  return {
    plan: PLAN,
    planName: "Self-hosted",
    originalPlan: PLAN,
    trial: null as string | null,
    isTrial: false,
    isOldAccount: false,
    isCustomer: false,
    isAnnualPlan: false,
    startsAt: null as Date | null,
    endsAt: null as Date | null,
    cancelledAt: null as Date | null,
    trialEndsAt: null as Date | null,
    pausedAt: null as Date | null,
    isPaused: false,
    isCancelled: false,
    pauseStartsAt: null as Date | null,
    pauseEndsAt: null as Date | null,
    discount: null,
    isFree: false,
    isStarter: false,
    isPro: true,
    isBusiness: true,
    isDatarooms: true,
    isDataroomsPlus: true,
    isDataroomsPremium: true,
    isDataroomsUnlimited: true,
    loading: false,
    error: undefined as unknown,
    mutate: async () => undefined,
  };
}
