import type {
  Decision,
  DecisionInput,
  ExpensePlan,
  ExpensePlanInput,
  WorkerPlan,
  WorkerPlanInput,
} from "./types";

const clampMoney = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;

const roundHours = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.ceil(value * 10) / 10) : 0;

const compactCad = (value: number) => `$${clampMoney(value).toFixed(2)}`;

export function calculateDecision(input: DecisionInput): Decision {
  const needLabel = input.needLabel?.trim().toLowerCase() || "essential";
  const needAmountCad = clampMoney(input.needAmountCad);
  const availableNowCad = clampMoney(input.availableNowCad);
  const deadlineMinutes = Math.max(0, input.deadlineMinutes);
  const pendingPayments = input.pendingPayments.map((payment) => ({
    amountCad: clampMoney(payment.amountCad),
    expectedInMinutes: Math.max(0, payment.expectedInMinutes),
  }));

  const gapNowCad = clampMoney(needAmountCad - availableNowCad);
  const pendingBeforeDeadlineCad = pendingPayments
    .filter((payment) => payment.expectedInMinutes <= deadlineMinutes)
    .reduce((total, payment) => total + payment.amountCad, 0);
  const totalPendingCad = pendingPayments.reduce(
    (total, payment) => total + payment.amountCad,
    0,
  );
  const availableBeforeDeadlineCad = clampMoney(
    availableNowCad + pendingBeforeDeadlineCad,
  );
  const gapAtDeadlineCad = clampMoney(
    needAmountCad - availableBeforeDeadlineCad,
  );
  const recommendedAdvanceCad = gapAtDeadlineCad;
  const advanceNowCad = gapNowCad;
  const medianHourlyNetCad = clampMoney(input.medianHourlyNetCad);
  const additionalHoursNeeded =
    medianHourlyNetCad > 0
      ? roundHours(recommendedAdvanceCad / medianHourlyNetCad)
      : 0;

  const useHistoricalFee =
    input.historicalAdvanceAmountCad !== undefined &&
    input.historicalAdvanceFeeCad !== undefined &&
    Math.abs(advanceNowCad - input.historicalAdvanceAmountCad) < 0.01;
  const estimatedAdvanceFeeCad = useHistoricalFee
    ? clampMoney(input.historicalAdvanceFeeCad ?? 0)
    : clampMoney(advanceNowCad * Math.max(0, input.historicalAdvanceFeeRate));
  const futurePayAfterRepaymentCad = clampMoney(
    totalPendingCad - advanceNowCad - estimatedAdvanceFeeCad,
  );
  const firstPayMinutes = pendingPayments.length
    ? Math.min(...pendingPayments.map((payment) => payment.expectedInMinutes))
    : null;

  let recommendationKind: Decision["recommendationKind"];
  let headline: string;
  let reason: string;

  if (gapNowCad === 0) {
    recommendationKind = "covered";
    headline = "COVERED NOW";
    reason = "Available funds already cover this need. No advance is needed.";
  } else if (
    pendingBeforeDeadlineCad > 0 &&
    availableBeforeDeadlineCad >= needAmountCad
  ) {
    recommendationKind = "wait";
    headline = `WAIT ${firstPayMinutes ?? 0} MINUTES`;
    reason = `Your pending ${compactCad(totalPendingCad)} is enough to cover the ${compactCad(needAmountCad)} ${needLabel} need before the deadline.`;
  } else if (pendingBeforeDeadlineCad > 0 && gapAtDeadlineCad < gapNowCad) {
    recommendationKind = "bridge";
    headline = `BRIDGE ONLY ${compactCad(gapAtDeadlineCad)}`;
    reason = `Pay arriving before the deadline covers part of the need. The true remaining gap is ${compactCad(gapAtDeadlineCad)}, not ${compactCad(gapNowCad)}.`;
  } else {
    recommendationKind = "timing-gap";
    headline = `TIMING GAP: ${compactCad(gapAtDeadlineCad)}`;
    reason =
      totalPendingCad > 0
        ? `The expected pay arrives after this deadline, leaving ${compactCad(gapAtDeadlineCad)} due first.`
        : `No pending pay is available before this deadline, leaving ${compactCad(gapAtDeadlineCad)} uncovered.`;
  }

  let raceLabel = "NO ACTIVE RACE";
  if (firstPayMinutes !== null && gapNowCad > 0) {
    const margin = deadlineMinutes - firstPayMinutes;
    if (Math.abs(margin) <= 5) raceLabel = "TOO CLOSE TO CALL";
    else if (margin > 0) raceLabel = `PAY WINS BY ${Math.round(margin)} MIN`;
    else raceLabel = `NEED ARRIVES ${Math.round(Math.abs(margin))} MIN FIRST`;
  }

  return {
    gapNowCad,
    availableBeforeDeadlineCad,
    gapAtDeadlineCad,
    recommendedAdvanceCad,
    advanceNowCad,
    additionalHoursNeeded,
    estimatedAdvanceFeeCad,
    futurePayAfterRepaymentCad,
    recommendationKind,
    headline,
    reason,
    raceLabel,
    payCoversNeed: availableBeforeDeadlineCad >= needAmountCad,
  };
}

export function calculateWorkerPlan(input: WorkerPlanInput): WorkerPlan {
  const earnedTodayCad = clampMoney(input.earnedTodayCad);
  const expensesDueCad = clampMoney(input.expensesDueCad);
  const cashAvailableCad = clampMoney(input.cashAvailableCad);
  const hourlyNetCad = clampMoney(input.hourlyNetCad);
  const payArrivesInMinutes = Math.max(0, input.payArrivesInMinutes);
  const expenseDueInMinutes = Math.max(0, input.expenseDueInMinutes);
  const totalResourcesCad = clampMoney(earnedTodayCad + cashAvailableCad);
  const earnedAfterExpensesCad = clampMoney(totalResourcesCad - expensesDueCad);
  const earningsShortfallCad = clampMoney(expensesDueCad - totalResourcesCad);
  const cashGapNowCad = clampMoney(expensesDueCad - cashAvailableCad);
  const timingMarginMinutes = expenseDueInMinutes - payArrivesInMinutes;
  const payArrivesBeforeNeed = timingMarginMinutes >= 0;
  const extraHoursNeeded =
    hourlyNetCad > 0 ? roundHours(earningsShortfallCad / hourlyNetCad) : 0;
  const advanceAmountCad = cashGapNowCad;
  const useHistoricalFee =
    input.historicalAdvanceAmountCad !== undefined &&
    input.historicalAdvanceFeeCad !== undefined &&
    Math.abs(advanceAmountCad - input.historicalAdvanceAmountCad) < 0.01;
  const advanceFeeCad = useHistoricalFee
    ? clampMoney(input.historicalAdvanceFeeCad ?? 0)
    : clampMoney(advanceAmountCad * Math.max(0, input.advanceFeeRate));
  const advanceRepaymentCad = clampMoney(advanceAmountCad + advanceFeeCad);
  const nextPayAfterAdvanceCad = clampMoney(
    earnedTodayCad - advanceRepaymentCad,
  );

  if (expensesDueCad === 0 || cashAvailableCad >= expensesDueCad) {
    return {
      status: "covered-now",
      earnedAfterExpensesCad,
      totalResourcesCad,
      earningsShortfallCad,
      cashGapNowCad,
      timingMarginMinutes,
      extraHoursNeeded,
      advanceAmountCad: 0,
      advanceFeeCad: 0,
      advanceRepaymentCad: 0,
      nextPayAfterAdvanceCad: earnedTodayCad,
      headline: "You can cover it now",
      plainSummary:
        expensesDueCad === 0
          ? "There is no expense entered for today."
          : `You have ${compactCad(cashAvailableCad)} available now, enough for the ${compactCad(expensesDueCad)} expense.`,
      bestMove: "Pay from available money",
      bestMoveReason: "No extra work or cash advance is needed.",
      advanceVerdict: "An advance would add a fee without solving a gap.",
    };
  }

  if (earningsShortfallCad > 0) {
    return {
      status: "earnings-shortfall",
      earnedAfterExpensesCad,
      totalResourcesCad,
      earningsShortfallCad,
      cashGapNowCad,
      timingMarginMinutes,
      extraHoursNeeded,
      advanceAmountCad,
      advanceFeeCad,
      advanceRepaymentCad,
      nextPayAfterAdvanceCad,
      headline: `You are ${compactCad(earningsShortfallCad)} short`,
      plainSummary: `Today’s pay plus available cash does not fully cover ${compactCad(expensesDueCad)} of expenses.`,
      bestMove:
        extraHoursNeeded > 0
          ? `About ${extraHoursNeeded.toFixed(1)} more work hours`
          : "Close the remaining shortfall",
      bestMoveReason:
        hourlyNetCad > 0
          ? `At ${compactCad(hourlyNetCad)} take-home per hour, that would earn the missing ${compactCad(earningsShortfallCad)}. Another option—not an obligation.`
          : `There is still ${compactCad(earningsShortfallCad)} to cover. No valid hourly rate is available for a work estimate.`,
      advanceVerdict: `An advance can cover today, but it does not create new income. Borrowing ${compactCad(advanceAmountCad)} would cost about ${compactCad(advanceFeeCad)}.`,
    };
  }

  if (!payArrivesBeforeNeed) {
    return {
      status: "timing-gap",
      earnedAfterExpensesCad,
      totalResourcesCad,
      earningsShortfallCad,
      cashGapNowCad,
      timingMarginMinutes,
      extraHoursNeeded,
      advanceAmountCad,
      advanceFeeCad,
      advanceRepaymentCad,
      nextPayAfterAdvanceCad,
      headline: "You earned enough, but it arrives late",
      plainSummary: `Your pay is expected ${Math.round(Math.abs(timingMarginMinutes))} minutes after the expense is due.`,
      bestMove: `Bridge only ${compactCad(advanceAmountCad)}`,
      bestMoveReason: `If the expense cannot wait, this is the cash timing gap. The estimated fee is ${compactCad(advanceFeeCad)}.`,
      advanceVerdict: `An ${compactCad(advanceAmountCad)} advance may solve the timing gap, but repayment would be ${compactCad(advanceRepaymentCad)}.`,
    };
  }

  return {
    status: "earned-enough",
    earnedAfterExpensesCad,
    totalResourcesCad,
    earningsShortfallCad,
    cashGapNowCad,
    timingMarginMinutes,
    extraHoursNeeded,
    advanceAmountCad,
    advanceFeeCad,
    advanceRepaymentCad,
    nextPayAfterAdvanceCad,
    headline: "You earned enough for today",
    plainSummary: `${compactCad(earnedTodayCad)} earned minus ${compactCad(expensesDueCad)} of expenses leaves ${compactCad(earnedAfterExpensesCad)} after essentials.`,
    bestMove: `Wait ${Math.round(payArrivesInMinutes)} minutes`,
    bestMoveReason: `Your pay is expected ${Math.round(timingMarginMinutes)} minutes before the expense is due.`,
    advanceVerdict: `An advance is not beneficial in this example. It would charge about ${compactCad(advanceFeeCad)} for money you have already earned.`,
  };
}

export function calculateExpensePlan(input: ExpensePlanInput): ExpensePlan {
  const earnedTodayCad = clampMoney(input.earnedTodayCad);
  const accountBalanceCad = clampMoney(input.accountBalanceCad);
  const hourlyNetCad = clampMoney(input.hourlyNetCad);
  const expenses = input.expenses.map((expense) => ({
    ...expense,
    name: expense.name.trim() || "Expense",
    amountCad: clampMoney(expense.amountCad),
    dueInMinutes: Math.max(0, expense.dueInMinutes ?? 0),
  }));

  const totalExpensesCad = clampMoney(
    expenses.reduce((sum, expense) => sum + expense.amountCad, 0),
  );
  const totalResourcesCad = clampMoney(accountBalanceCad + earnedTodayCad);
  const remainingAfterExpensesCad = clampMoney(
    totalResourcesCad - totalExpensesCad,
  );
  const earningsShortfallCad = clampMoney(
    totalExpensesCad - totalResourcesCad,
  );
  const extraHoursNeeded =
    hourlyNetCad > 0 ? roundHours(earningsShortfallCad / hourlyNetCad) : 0;

  let runningBalance = totalResourcesCad;
  const coverage = expenses.map((expense) => {
    runningBalance -= expense.amountCad;
    const shortAtDueCad = clampMoney(-runningBalance);
    return {
      ...expense,
      coveredAtDue: shortAtDueCad === 0,
      shortAtDueCad,
      runningBalanceAfterCad: clampMoney(runningBalance),
    };
  });
  const minimumAdvanceCad = earningsShortfallCad;

  const useHistoricalFee =
    input.historicalAdvanceAmountCad !== undefined &&
    input.historicalAdvanceFeeCad !== undefined &&
    Math.abs(minimumAdvanceCad - input.historicalAdvanceAmountCad) < 0.01;
  const advanceFeeCad = useHistoricalFee
    ? clampMoney(input.historicalAdvanceFeeCad ?? 0)
    : clampMoney(minimumAdvanceCad * Math.max(0, input.advanceFeeRate));
  const advanceRepaymentCad = clampMoney(
    minimumAdvanceCad + advanceFeeCad,
  );
  const nextPayAfterRepaymentCad = clampMoney(
    earnedTodayCad - advanceRepaymentCad,
  );

  if (earningsShortfallCad === 0) {
    return {
      status: "all-covered",
      totalExpensesCad,
      totalResourcesCad,
      remainingAfterExpensesCad,
      earningsShortfallCad,
      extraHoursNeeded,
      minimumAdvanceCad,
      advanceFeeCad,
      advanceRepaymentCad,
      nextPayAfterRepaymentCad,
      coverage,
      headline: "Yes — every expense is covered",
      summary: `After all listed expenses, ${compactCad(remainingAfterExpensesCad)} remains.`,
    };
  }

  return {
    status: "earnings-shortfall",
    totalExpensesCad,
    totalResourcesCad,
    remainingAfterExpensesCad,
    earningsShortfallCad,
    extraHoursNeeded,
    minimumAdvanceCad,
    advanceFeeCad,
    advanceRepaymentCad,
    nextPayAfterRepaymentCad,
    coverage,
    headline: `No — ${compactCad(earningsShortfallCad)} is still missing`,
    summary:
      hourlyNetCad > 0
        ? `You can work about ${extraHoursNeeded.toFixed(1)} more paid hours, or borrow ${compactCad(minimumAdvanceCad)} and pay an estimated ${compactCad(advanceFeeCad)} fee.`
        : `You can borrow ${compactCad(minimumAdvanceCad)} and pay an estimated ${compactCad(advanceFeeCad)} fee.`,
  };
}
