export type Confidence = "High" | "Medium" | "Low";

export type GeneratedDemo = {
  source: {
    scenarioType: "preferred" | "automatic_fallback";
    replayLabel: string;
    recordCounts: {
      earnings: number;
      advances: number;
      obligations: number;
      transactions: number;
      weeklySummaries: number;
      workers: number;
      matchedPayouts: number;
    };
  };
  worker: {
    id: string;
    occupation: string;
    city: string;
    province: string;
    typicalDailyNetCad: number;
    medianHourlyNetCad: number;
    historicalMedianAdvanceFeeRate: number;
  };
  replay: {
    startedAt: string;
    depositAt: string;
    actualWaitMinutes: number;
    needReason: string;
    needAmountCad: number;
    availableNowAssumptionCad: number;
    pendingPayCad: number;
    hoursWorked: number;
    advanceFeeCad: number;
    advanceId: string;
    earningsId: string;
    depositTransactionId: string;
    employerId: string;
    paymentMethod: string;
  };
  payoutEstimate: {
    expectedDelayMinutes: number;
    supportCount: number;
    confidence: Confidence;
    fallbackLevel: string;
    note: string;
  };
  nextEssentialObligation: {
    id: string;
    name: string;
    category: string;
    amountCad: number;
    dueAt: string;
  } | null;
  insights: {
    advancesFollowedBySufficientPayWithin24HoursPct: number;
    medianMinutesToNextIncomeDeposit: number;
    totalObservedAdvanceFeesCad: number;
    eligibleAdvanceCount: number;
  };
  growth: {
    earningOpportunities: Array<{
      occupation: string;
      medianDailyNetCad: number;
      supportCount: number;
      city: string;
    }>;
    spendingInsights: Array<{
      category: string;
      label: string;
      purchaseCount: number;
      totalSpentCad: number;
      medianPurchaseCad: number;
      suggestedAlternative: string;
    }>;
  };
};

export type PendingPayment = {
  amountCad: number;
  expectedInMinutes: number;
};

export type DecisionInput = {
  needLabel?: string;
  needAmountCad: number;
  availableNowCad: number;
  deadlineMinutes: number;
  pendingPayments: PendingPayment[];
  medianHourlyNetCad: number;
  historicalAdvanceFeeRate: number;
  historicalAdvanceAmountCad?: number;
  historicalAdvanceFeeCad?: number;
};

export type RecommendationKind =
  | "covered"
  | "wait"
  | "bridge"
  | "timing-gap";

export type Decision = {
  gapNowCad: number;
  availableBeforeDeadlineCad: number;
  gapAtDeadlineCad: number;
  recommendedAdvanceCad: number;
  advanceNowCad: number;
  additionalHoursNeeded: number;
  estimatedAdvanceFeeCad: number;
  futurePayAfterRepaymentCad: number;
  recommendationKind: RecommendationKind;
  headline: string;
  reason: string;
  raceLabel: string;
  payCoversNeed: boolean;
};

export type WorkerPlanInput = {
  earnedTodayCad: number;
  expensesDueCad: number;
  cashAvailableCad: number;
  payArrivesInMinutes: number;
  expenseDueInMinutes: number;
  hourlyNetCad: number;
  advanceFeeRate: number;
  historicalAdvanceAmountCad?: number;
  historicalAdvanceFeeCad?: number;
};

export type WorkerPlanStatus =
  | "covered-now"
  | "earned-enough"
  | "timing-gap"
  | "earnings-shortfall";

export type WorkerPlan = {
  status: WorkerPlanStatus;
  earnedAfterExpensesCad: number;
  totalResourcesCad: number;
  earningsShortfallCad: number;
  cashGapNowCad: number;
  timingMarginMinutes: number;
  extraHoursNeeded: number;
  advanceAmountCad: number;
  advanceFeeCad: number;
  advanceRepaymentCad: number;
  nextPayAfterAdvanceCad: number;
  headline: string;
  plainSummary: string;
  bestMove: string;
  bestMoveReason: string;
  advanceVerdict: string;
};

export type UpcomingExpense = {
  id: string;
  name: string;
  amountCad: number;
  dueInMinutes?: number;
};

export type ExpenseCoverage = UpcomingExpense & {
  coveredAtDue: boolean;
  shortAtDueCad: number;
  runningBalanceAfterCad: number;
};

export type ExpensePlanInput = {
  earnedTodayCad: number;
  accountBalanceCad: number;
  payArrivesInMinutes?: number;
  hourlyNetCad: number;
  expenses: UpcomingExpense[];
  advanceFeeRate: number;
  historicalAdvanceAmountCad?: number;
  historicalAdvanceFeeCad?: number;
};

export type ExpensePlanStatus =
  | "all-covered"
  | "earnings-shortfall";

export type ExpensePlan = {
  status: ExpensePlanStatus;
  totalExpensesCad: number;
  totalResourcesCad: number;
  remainingAfterExpensesCad: number;
  earningsShortfallCad: number;
  extraHoursNeeded: number;
  minimumAdvanceCad: number;
  advanceFeeCad: number;
  advanceRepaymentCad: number;
  nextPayAfterRepaymentCad: number;
  coverage: ExpenseCoverage[];
  headline: string;
  summary: string;
};
