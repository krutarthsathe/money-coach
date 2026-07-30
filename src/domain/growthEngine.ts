export type EarningOpportunity = {
  occupation: string;
  medianDailyNetCad: number;
  supportCount: number;
  city: string;
};

export type OpportunityComparison = EarningOpportunity & {
  gainPerDayCad: number;
  gainPerFiveDayWeekCad: number;
  gainPerMonthCad: number;
};

export type SpendDecision = {
  skipSavingsCad: number;
  alternativeSavingsCad: number;
  monthlySavingsCad: number;
  yearlySavingsCad: number;
  workHoursRecovered: number;
};

const money = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;

const hours = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value * 10) / 10) : 0;

export function compareEarningOpportunities(
  currentOfferCad: number,
  opportunities: EarningOpportunity[],
): OpportunityComparison[] {
  const current = money(currentOfferCad);
  return opportunities
    .map((opportunity) => {
      const daily = money(opportunity.medianDailyNetCad);
      const gainPerDayCad = money(daily - current);
      return {
        ...opportunity,
        medianDailyNetCad: daily,
        gainPerDayCad,
        gainPerFiveDayWeekCad: money(gainPerDayCad * 5),
        gainPerMonthCad: money(gainPerDayCad * 5 * 4.33),
      };
    })
    .filter((opportunity) => opportunity.gainPerDayCad > 0)
    .sort((a, b) => b.gainPerDayCad - a.gainPerDayCad);
}

export function calculateSpendDecision({
  plannedSpendCad,
  alternativeCostCad,
  timesPerWeek,
  hourlyNetCad,
}: {
  plannedSpendCad: number;
  alternativeCostCad: number;
  timesPerWeek: number;
  hourlyNetCad: number;
}): SpendDecision {
  const planned = money(plannedSpendCad);
  const alternative = money(alternativeCostCad);
  const frequency = Math.max(
    0,
    Math.min(14, Number.isFinite(timesPerWeek) ? timesPerWeek : 0),
  );
  const alternativeSavingsCad = money(planned - alternative);
  const monthlySavingsCad = money(alternativeSavingsCad * frequency * 4.33);
  const yearlySavingsCad = money(alternativeSavingsCad * frequency * 52);
  const hourly = money(hourlyNetCad);

  return {
    skipSavingsCad: planned,
    alternativeSavingsCad,
    monthlySavingsCad,
    yearlySavingsCad,
    workHoursRecovered: hourly > 0 ? hours(alternativeSavingsCad / hourly) : 0,
  };
}
