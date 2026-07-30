export type ForecastPeriod = "daily" | "weekly" | "monthly";

export type ForecastInput = {
  year: number;
  monthIndex: number;
  earningsPerWorkdayCad: number;
  workDaysPerWeek: number;
  monthlyBillsCad: number;
  weeklyEssentialsCad: number;
};

export type ForecastDay = {
  date: string;
  day: number;
  weekday: number;
  isWorkDay: boolean;
  incomeCad: number;
  expenseCad: number;
  netCad: number;
};

export type ForecastSummary = {
  period: ForecastPeriod;
  label: string;
  incomeCad: number;
  expenseCad: number;
  netCad: number;
  workDays: number;
};

const money = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;

const signedMoney = (value: number) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function buildMonthForecast(input: ForecastInput): ForecastDay[] {
  const daysInMonth = new Date(
    input.year,
    input.monthIndex + 1,
    0,
  ).getDate();
  const earningsPerWorkdayCad = money(input.earningsPerWorkdayCad);
  const workDaysPerWeek = Math.max(
    0,
    Math.min(7, Math.round(input.workDaysPerWeek)),
  );
  const monthlyBillsCad = money(input.monthlyBillsCad);
  const weeklyEssentialsCad = money(input.weeklyEssentialsCad);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(input.year, input.monthIndex, day);
    const weekday = date.getDay();
    const mondayBasedWeekday = (weekday + 6) % 7;
    const isWorkDay = mondayBasedWeekday < workDaysPerWeek;
    const incomeCad = isWorkDay ? earningsPerWorkdayCad : 0;
    const expenseCad = money(
      (day === 15 ? monthlyBillsCad : 0) +
        (weekday === 6 ? weeklyEssentialsCad : 0),
    );
    return {
      date: dateKey(date),
      day,
      weekday,
      isWorkDay,
      incomeCad,
      expenseCad,
      netCad: signedMoney(incomeCad - expenseCad),
    };
  });
}

export function summarizeForecast(
  days: ForecastDay[],
  selectedDate: string,
  period: ForecastPeriod,
): ForecastSummary {
  const selected = days.find((day) => day.date === selectedDate) ?? days[0];
  if (!selected) {
    return {
      period,
      label: "No forecast",
      incomeCad: 0,
      expenseCad: 0,
      netCad: 0,
      workDays: 0,
    };
  }

  let included: ForecastDay[];
  let label: string;
  if (period === "daily") {
    included = [selected];
    label = `Day ${selected.day}`;
  } else if (period === "weekly") {
    const selectedDateObject = new Date(`${selected.date}T12:00:00`);
    const sunday = new Date(selectedDateObject);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(saturday.getDate() + 6);
    included = days.filter((day) => {
      const date = new Date(`${day.date}T12:00:00`);
      return date >= sunday && date <= saturday;
    });
    label = `Week of ${sunday.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    })}`;
  } else {
    included = days;
    const monthDate = new Date(`${selected.date}T12:00:00`);
    label = monthDate.toLocaleDateString("en-CA", {
      month: "long",
      year: "numeric",
    });
  }

  const incomeCad = money(
    included.reduce((sum, day) => sum + day.incomeCad, 0),
  );
  const expenseCad = money(
    included.reduce((sum, day) => sum + day.expenseCad, 0),
  );
  return {
    period,
    label,
    incomeCad,
    expenseCad,
    netCad: signedMoney(incomeCad - expenseCad),
    workDays: included.filter((day) => day.isWorkDay).length,
  };
}
