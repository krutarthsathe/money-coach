import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  buildMonthForecast,
  summarizeForecast,
  type ForecastPeriod,
} from "../domain/forecastEngine";
import { formatCad } from "../utils/currency";

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

const parseAmount = (value: string, max = 99999) => {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(max, parsed)) : 0;
};

const monthLabel = (year: number, monthIndex: number) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));

function ForecastInput({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  testID: string;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          testID={testID}
          value={value.toFixed(2)}
          onChangeText={(text) => onChange(parseAmount(text))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.input}
          accessibilityLabel={`${label} in Canadian dollars`}
        />
      </View>
    </View>
  );
}

export function ForecastCalendar({
  hourlyNetCad,
  advanceFeeRate,
}: {
  hourlyNetCad: number;
  advanceFeeRate: number;
}) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [period, setPeriod] = useState<ForecastPeriod>("monthly");
  const [earningsPerWorkday, setEarningsPerWorkday] = useState(159.71);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(5);
  const [monthlyBills, setMonthlyBills] = useState(1098);
  const [weeklyEssentials, setWeeklyEssentials] = useState(130.74);

  const forecast = useMemo(
    () =>
      buildMonthForecast({
        year,
        monthIndex,
        earningsPerWorkdayCad: earningsPerWorkday,
        workDaysPerWeek,
        monthlyBillsCad: monthlyBills,
        weeklyEssentialsCad: weeklyEssentials,
      }),
    [
      earningsPerWorkday,
      monthIndex,
      monthlyBills,
      weeklyEssentials,
      workDaysPerWeek,
      year,
    ],
  );
  const safeSelectedDay = Math.min(selectedDay, forecast.length || 1);
  const selectedDate = forecast[safeSelectedDay - 1]?.date ?? "";
  const summary = summarizeForecast(forecast, selectedDate, period);
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...forecast,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shortfallCad = Math.max(0, -summary.netCad);
  const extraHours =
    shortfallCad > 0 && hourlyNetCad > 0
      ? Math.ceil((shortfallCad / hourlyNetCad) * 10) / 10
      : 0;
  const feeCad = Math.round(shortfallCad * advanceFeeRate * 100) / 100;
  const repaymentCad = Math.round((shortfallCad + feeCad) * 100) / 100;

  const moveMonth = (direction: -1 | 1) => {
    const next = new Date(year, monthIndex + direction, 1);
    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
    setSelectedDay(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>INCOME FORECAST</Text>
        <Text style={styles.title}>See the month before it happens.</Text>
        <Text style={styles.subtitle}>
          Use simple assumptions to forecast one day, one week, or the full
          month. This is a planning estimate, not a pay guarantee.
        </Text>
      </View>

      <View style={styles.assumptionCard}>
        <Text style={styles.sectionKicker}>EDITABLE ASSUMPTIONS</Text>
        <View style={styles.inputGrid}>
          <ForecastInput
            testID="forecast-daily-earnings"
            label="Earn per workday"
            value={earningsPerWorkday}
            onChange={setEarningsPerWorkday}
          />
          <ForecastInput
            testID="forecast-monthly-bills"
            label="Monthly bills"
            value={monthlyBills}
            onChange={setMonthlyBills}
          />
          <ForecastInput
            testID="forecast-weekly-essentials"
            label="Weekly essentials"
            value={weeklyEssentials}
            onChange={setWeeklyEssentials}
          />
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Workdays each week</Text>
            <View style={styles.stepper}>
              <Pressable
                testID="workdays-minus"
                onPress={() =>
                  setWorkDaysPerWeek((value) => Math.max(0, value - 1))
                }
                style={styles.stepButton}
                accessibilityRole="button"
              >
                <Text style={styles.stepButtonText}>−</Text>
              </Pressable>
              <Text testID="workdays-value" style={styles.stepValue}>
                {workDaysPerWeek}
              </Text>
              <Pressable
                testID="workdays-plus"
                onPress={() =>
                  setWorkDaysPerWeek((value) => Math.min(7, value + 1))
                }
                style={styles.stepButton}
                accessibilityRole="button"
              >
                <Text style={styles.stepButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <View style={styles.assumptionNote}>
          <Text style={styles.assumptionNoteText}>
            Monthly bills are placed on the 15th. Weekly essentials are placed
            on Saturdays so the calendar can show cash-flow pressure.
          </Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable
            testID="previous-month"
            onPress={() => moveMonth(-1)}
            style={styles.monthButton}
            accessibilityRole="button"
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{monthLabel(year, monthIndex)}</Text>
          <Pressable
            testID="next-month"
            onPress={() => moveMonth(1)}
            style={styles.monthButton}
            accessibilityRole="button"
          >
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {weekdays.map((weekday, index) => (
            <Text key={`${weekday}-${index}`} style={styles.weekday}>
              {weekday}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((day, index) => (
            <View key={day?.date ?? `blank-${index}`} style={styles.cellWrap}>
              {day ? (
                <Pressable
                  testID={`forecast-day-${day.day}`}
                  onPress={() => setSelectedDay(day.day)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: day.day === safeSelectedDay }}
                  style={[
                    styles.dayCell,
                    day.day === safeSelectedDay && styles.dayCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      day.day === safeSelectedDay &&
                        styles.dayNumberSelected,
                    ]}
                  >
                    {day.day}
                  </Text>
                  {day.incomeCad > 0 ? (
                    <Text style={styles.incomeText}>
                      +{Math.round(day.incomeCad)}
                    </Text>
                  ) : (
                    <Text style={styles.offText}>off</Text>
                  )}
                  {day.expenseCad > 0 ? (
                    <Text style={styles.expenseText}>
                      −{Math.round(day.expenseCad)}
                    </Text>
                  ) : null}
                </Pressable>
              ) : (
                <View style={styles.blankCell} />
              )}
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.incomeDot]} />
            <Text style={styles.legendText}>Projected earnings</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.expenseDot]} />
            <Text style={styles.legendText}>Planned expenses</Text>
          </View>
        </View>
      </View>

      <View style={styles.periodTabs}>
        {(["daily", "weekly", "monthly"] as ForecastPeriod[]).map(
          (option) => (
            <Pressable
              key={option}
              testID={`forecast-period-${option}`}
              onPress={() => setPeriod(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: period === option }}
              style={[
                styles.periodTab,
                period === option && styles.periodTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.periodTabText,
                  period === option && styles.periodTabTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      <View
        testID="forecast-summary"
        style={[
          styles.summaryCard,
          summary.netCad >= 0 ? styles.summaryPositive : styles.summaryNegative,
        ]}
      >
        <Text style={styles.summaryLabel}>{summary.label.toUpperCase()}</Text>
        <Text style={styles.summaryTitle}>
          {summary.netCad >= 0
            ? `On track by ${formatCad(summary.netCad)}`
            : `Short by ${formatCad(shortfallCad)}`}
        </Text>
        <View style={styles.summaryMetrics}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricLabel}>EARNINGS</Text>
            <Text style={styles.summaryMetricValue}>
              {formatCad(summary.incomeCad)}
            </Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricLabel}>EXPENSES</Text>
            <Text style={styles.summaryMetricValue}>
              {formatCad(summary.expenseCad)}
            </Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricLabel}>WORKDAYS</Text>
            <Text style={styles.summaryMetricValue}>{summary.workDays}</Text>
          </View>
        </View>
        {shortfallCad > 0 ? (
          <View style={styles.shortfallActions}>
            <Text style={styles.shortfallTitle}>Two ways to close the gap</Text>
            <Text style={styles.shortfallText}>
              Work about {extraHours.toFixed(1)} more hours at{" "}
              {formatCad(hourlyNetCad)}/hr, or borrow {formatCad(shortfallCad)},
              pay about {formatCad(feeCad)} in fees, and repay{" "}
              {formatCad(repaymentCad)}.
            </Text>
          </View>
        ) : (
          <Text style={styles.positiveNote}>
            Projected earnings cover the selected period’s planned expenses.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  intro: {
    marginTop: 30,
  },
  eyebrow: {
    color: "#A96122",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 8,
    color: "#172B27",
    fontSize: 32,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  subtitle: {
    marginTop: 10,
    color: "#6E706A",
    fontSize: 13,
    lineHeight: 19,
  },
  assumptionCard: {
    marginTop: 22,
    padding: 17,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#DDD7CC",
    backgroundColor: "#FFFDF8",
  },
  sectionKicker: {
    color: "#77736A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  inputWrap: {
    width: "48%",
  },
  inputLabel: {
    minHeight: 27,
    color: "#626660",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  inputBox: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: "#F1EEE6",
  },
  currency: {
    color: "#858178",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    marginLeft: 4,
    padding: 0,
    color: "#1C332C",
    fontSize: 16,
    fontWeight: "900",
  },
  stepper: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 5,
    borderRadius: 13,
    backgroundColor: "#F1EEE6",
  },
  stepButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#FFFDF8",
  },
  stepButtonText: {
    color: "#1E6A54",
    fontSize: 18,
    fontWeight: "800",
  },
  stepValue: {
    color: "#1C332C",
    fontSize: 16,
    fontWeight: "900",
  },
  assumptionNote: {
    marginTop: 14,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#F3EFE6",
  },
  assumptionNoteText: {
    color: "#807D74",
    fontSize: 9,
    lineHeight: 14,
  },
  calendarCard: {
    marginTop: 14,
    padding: 13,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#DDD7CC",
    backgroundColor: "#FFFDF8",
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
    paddingBottom: 12,
  },
  monthButton: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#EEE9DF",
  },
  monthButtonText: {
    color: "#315248",
    fontSize: 25,
    lineHeight: 27,
  },
  monthTitle: {
    color: "#233832",
    fontSize: 16,
    fontWeight: "900",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  weekday: {
    width: "14.2857%",
    color: "#99958B",
    fontSize: 8,
    fontWeight: "900",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cellWrap: {
    width: "14.2857%",
    padding: 2,
  },
  dayCell: {
    minHeight: 61,
    padding: 5,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#ECE7DD",
    backgroundColor: "#FAF8F3",
  },
  dayCellSelected: {
    borderColor: "#1E6A54",
    backgroundColor: "#E4EFE9",
  },
  blankCell: {
    minHeight: 61,
  },
  dayNumber: {
    color: "#5B615C",
    fontSize: 9,
    fontWeight: "900",
  },
  dayNumberSelected: {
    color: "#1E6A54",
  },
  incomeText: {
    marginTop: 5,
    color: "#1E6A54",
    fontSize: 7,
    fontWeight: "900",
  },
  expenseText: {
    marginTop: 3,
    color: "#A4443B",
    fontSize: 7,
    fontWeight: "900",
  },
  offText: {
    marginTop: 5,
    color: "#B2ADA3",
    fontSize: 7,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 11,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 7,
    height: 7,
    marginRight: 5,
    borderRadius: 4,
  },
  incomeDot: {
    backgroundColor: "#1E6A54",
  },
  expenseDot: {
    backgroundColor: "#A4443B",
  },
  legendText: {
    color: "#8B887F",
    fontSize: 8,
  },
  periodTabs: {
    flexDirection: "row",
    marginTop: 14,
    padding: 4,
    borderRadius: 15,
    backgroundColor: "#E8E3D9",
  },
  periodTab: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  periodTabSelected: {
    backgroundColor: "#FFFDF8",
  },
  periodTabText: {
    color: "#87837A",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  periodTabTextSelected: {
    color: "#1E6A54",
  },
  summaryCard: {
    marginTop: 12,
    padding: 19,
    borderRadius: 23,
  },
  summaryPositive: {
    backgroundColor: "#1E6A54",
  },
  summaryNegative: {
    backgroundColor: "#A4443B",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  summaryTitle: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  summaryMetrics: {
    flexDirection: "row",
    gap: 7,
    marginTop: 15,
  },
  summaryMetric: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  summaryMetricLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 7,
    fontWeight: "900",
  },
  summaryMetricValue: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  shortfallActions: {
    marginTop: 14,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  shortfallTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  shortfallText: {
    marginTop: 5,
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    lineHeight: 15,
  },
  positiveNote: {
    marginTop: 13,
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    lineHeight: 15,
  },
});
