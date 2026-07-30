import assert from "node:assert/strict";
import generated from "../src/data/generatedDemo.json";
import {
  calculateDecision,
  calculateExpensePlan,
  calculateWorkerPlan,
} from "../src/domain/decisionEngine";
import {
  buildMonthForecast,
  summarizeForecast,
} from "../src/domain/forecastEngine";
import {
  calculateSpendDecision,
  compareEarningOpportunities,
} from "../src/domain/growthEngine";

const base = {
  needLabel: "grocery",
  needAmountCad: generated.replay.needAmountCad,
  availableNowCad: 0,
  deadlineMinutes: 60,
  pendingPayments: [
    {
      amountCad: generated.replay.pendingPayCad,
      expectedInMinutes: generated.replay.actualWaitMinutes,
    },
  ],
  medianHourlyNetCad: generated.worker.medianHourlyNetCad,
  historicalAdvanceFeeRate:
    generated.worker.historicalMedianAdvanceFeeRate,
  historicalAdvanceAmountCad: generated.replay.needAmountCad,
  historicalAdvanceFeeCad: generated.replay.advanceFeeCad,
};

const hero = calculateDecision(base);
assert.equal(hero.recommendationKind, "wait");
assert.equal(hero.raceLabel, "PAY WINS BY 25 MIN");
assert.equal(hero.estimatedAdvanceFeeCad, 4.29);
assert.equal(hero.gapNowCad, 85.74);
assert.equal(hero.gapAtDeadlineCad, 0);

const deadlineFirst = calculateDecision({ ...base, deadlineMinutes: 30 });
assert.equal(deadlineFirst.recommendationKind, "timing-gap");
assert.equal(deadlineFirst.gapAtDeadlineCad, 85.74);
assert.equal(deadlineFirst.raceLabel, "TOO CLOSE TO CALL");

const partlyAvailable = calculateDecision({ ...base, availableNowCad: 40 });
assert.equal(partlyAvailable.gapNowCad, 45.74);
assert.equal(partlyAvailable.gapAtDeadlineCad, 0);

const partlyCovered = calculateDecision({
  ...base,
  needAmountCad: 200,
});
assert.equal(partlyCovered.recommendationKind, "bridge");
assert.equal(partlyCovered.gapAtDeadlineCad, 40.29);

const covered = calculateDecision({
  ...base,
  availableNowCad: 100,
});
assert.equal(covered.recommendationKind, "covered");
assert.equal(covered.recommendedAdvanceCad, 0);

const arrived = calculateDecision({
  ...base,
  availableNowCad: generated.replay.pendingPayCad,
  pendingPayments: [],
});
assert.equal(arrived.recommendationKind, "covered");
assert.equal(arrived.gapNowCad, 0);

console.log("Decision engine verified: 6 deterministic scenarios passed.");

const workerPlanBase = {
  earnedTodayCad: 159.71,
  expensesDueCad: 85.74,
  cashAvailableCad: 0,
  payArrivesInMinutes: 35,
  expenseDueInMinutes: 60,
  hourlyNetCad: 18.88,
  advanceFeeRate: 0.0545,
  historicalAdvanceAmountCad: 85.74,
  historicalAdvanceFeeCad: 4.29,
};

const earnedEnoughPlan = calculateWorkerPlan(workerPlanBase);
assert.equal(earnedEnoughPlan.status, "earned-enough");
assert.equal(earnedEnoughPlan.earnedAfterExpensesCad, 73.97);
assert.equal(earnedEnoughPlan.advanceFeeCad, 4.29);
assert.equal(earnedEnoughPlan.nextPayAfterAdvanceCad, 69.68);

const latePayPlan = calculateWorkerPlan({
  ...workerPlanBase,
  payArrivesInMinutes: 90,
});
assert.equal(latePayPlan.status, "timing-gap");
assert.equal(latePayPlan.advanceAmountCad, 85.74);

const shortfallPlan = calculateWorkerPlan({
  ...workerPlanBase,
  earnedTodayCad: 50,
});
assert.equal(shortfallPlan.status, "earnings-shortfall");
assert.equal(shortfallPlan.earningsShortfallCad, 35.74);
assert.equal(shortfallPlan.extraHoursNeeded, 1.9);

const coveredNowPlan = calculateWorkerPlan({
  ...workerPlanBase,
  cashAvailableCad: 100,
});
assert.equal(coveredNowPlan.status, "covered-now");
assert.equal(coveredNowPlan.advanceAmountCad, 0);

console.log("Worker plan verified: 4 plain-language scenarios passed.");

const upcomingExpenses = [
  { id: "groceries", name: "Groceries", amountCad: 85.74, dueInMinutes: 60 },
  { id: "phone", name: "Phone bill", amountCad: 88, dueInMinutes: 24 * 60 },
  { id: "fuel", name: "Fuel", amountCad: 45, dueInMinutes: 3 * 24 * 60 },
];

const listShortfall = calculateExpensePlan({
  earnedTodayCad: 159.71,
  accountBalanceCad: 20,
  payArrivesInMinutes: 35,
  hourlyNetCad: 18.88,
  expenses: upcomingExpenses,
  advanceFeeRate: 0.0545,
});
assert.equal(listShortfall.status, "earnings-shortfall");
assert.equal(listShortfall.totalExpensesCad, 218.74);
assert.equal(listShortfall.earningsShortfallCad, 39.03);
assert.equal(listShortfall.extraHoursNeeded, 2.1);
assert.equal(listShortfall.minimumAdvanceCad, 39.03);

const listCovered = calculateExpensePlan({
  earnedTodayCad: 200,
  accountBalanceCad: 50,
  payArrivesInMinutes: 35,
  hourlyNetCad: 18.88,
  expenses: upcomingExpenses,
  advanceFeeRate: 0.0545,
});
assert.equal(listCovered.status, "all-covered");
assert.equal(listCovered.remainingAfterExpensesCad, 31.26);
assert.equal(listCovered.minimumAdvanceCad, 0);

const unexpectedExpensePlan = calculateExpensePlan({
  earnedTodayCad: 159.71,
  accountBalanceCad: 20,
  payArrivesInMinutes: 90,
  hourlyNetCad: 18.88,
  expenses: [
    ...upcomingExpenses,
    { id: "repair", name: "Emergency repair", amountCad: 120, dueInMinutes: 0 },
  ],
  advanceFeeRate: 0.0545,
});
assert.equal(unexpectedExpensePlan.status, "earnings-shortfall");
assert.equal(unexpectedExpensePlan.minimumAdvanceCad, 159.03);
assert.equal(unexpectedExpensePlan.extraHoursNeeded, 8.5);

console.log("Upcoming-expense plan verified: 3 list scenarios passed.");

const augustForecast = buildMonthForecast({
  year: 2026,
  monthIndex: 7,
  earningsPerWorkdayCad: 159.71,
  workDaysPerWeek: 5,
  monthlyBillsCad: 1098,
  weeklyEssentialsCad: 130.74,
});
assert.equal(augustForecast.length, 31);
assert.equal(augustForecast.filter((day) => day.isWorkDay).length, 21);

const augustMonthly = summarizeForecast(
  augustForecast,
  "2026-08-15",
  "monthly",
);
assert.equal(augustMonthly.incomeCad, 3353.91);
assert.equal(augustMonthly.expenseCad, 1751.7);
assert.equal(augustMonthly.netCad, 1602.21);

const augustWeek = summarizeForecast(
  augustForecast,
  "2026-08-05",
  "weekly",
);
assert.equal(augustWeek.incomeCad, 798.55);
assert.equal(augustWeek.expenseCad, 130.74);
assert.equal(augustWeek.netCad, 667.81);

const augustBillsDay = summarizeForecast(
  augustForecast,
  "2026-08-15",
  "daily",
);
assert.equal(augustBillsDay.incomeCad, 0);
assert.equal(augustBillsDay.expenseCad, 1228.74);
assert.equal(augustBillsDay.netCad, -1228.74);

console.log("Calendar forecast verified: daily, weekly, and monthly scenarios passed.");

const earningComparisons = compareEarningOpportunities(
  generated.replay.pendingPayCad,
  generated.growth.earningOpportunities,
);
assert.equal(earningComparisons[0]?.occupation, "Construction labourer");
assert.equal(earningComparisons[0]?.gainPerDayCad, 77.95);
assert.equal(earningComparisons[0]?.gainPerFiveDayWeekCad, 389.75);
assert.equal(earningComparisons[0]?.gainPerMonthCad, 1687.62);

const competitiveOffer = compareEarningOpportunities(
  300,
  generated.growth.earningOpportunities,
);
assert.equal(competitiveOffer.length, 0);

const restaurantSwap = calculateSpendDecision({
  plannedSpendCad: 33.09,
  alternativeCostCad: 12,
  timesPerWeek: 1,
  hourlyNetCad: 18.88,
});
assert.equal(restaurantSwap.skipSavingsCad, 33.09);
assert.equal(restaurantSwap.alternativeSavingsCad, 21.09);
assert.equal(restaurantSwap.monthlySavingsCad, 91.32);
assert.equal(restaurantSwap.yearlySavingsCad, 1096.68);
assert.equal(restaurantSwap.workHoursRecovered, 1.1);

const expensiveAlternative = calculateSpendDecision({
  plannedSpendCad: 20,
  alternativeCostCad: 30,
  timesPerWeek: 2,
  hourlyNetCad: 20,
});
assert.equal(expensiveAlternative.alternativeSavingsCad, 0);
assert.equal(expensiveAlternative.monthlySavingsCad, 0);

console.log("Earn-and-save coach verified: 4 opportunity and spending scenarios passed.");
