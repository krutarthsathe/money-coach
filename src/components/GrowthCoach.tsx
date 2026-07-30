import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  calculateSpendDecision,
  compareEarningOpportunities,
  type EarningOpportunity,
} from "../domain/growthEngine";
import { formatCad } from "../utils/currency";

type SpendingInsight = {
  category: string;
  label: string;
  purchaseCount: number;
  totalSpentCad: number;
  medianPurchaseCad: number;
  suggestedAlternative: string;
};

type Props = {
  currentOccupation: string;
  city: string;
  defaultCurrentOfferCad: number;
  defaultHours: number;
  hourlyNetCad: number;
  opportunities: EarningOpportunity[];
  spendingInsights: SpendingInsight[];
};

const parseAmount = (value: string, max = 9999) => {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, max)) : 0;
};

const alternativeDefault = (category: string, plannedSpendCad: number) => {
  if (category === "food_out") return 12;
  if (category === "entertainment") return 0;
  if (category === "clothing") return Math.round(plannedSpendCad * 0.35 * 100) / 100;
  return Math.round(plannedSpendCad * 0.6 * 100) / 100;
};

function MoneyField({
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
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.moneyField}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          testID={testID}
          value={value.toFixed(2)}
          onChangeText={(text) => onChange(parseAmount(text))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel={`${label} in Canadian dollars`}
          style={styles.moneyText}
        />
      </View>
    </View>
  );
}

export function GrowthCoach({
  currentOccupation,
  city,
  defaultCurrentOfferCad,
  defaultHours,
  hourlyNetCad,
  opportunities,
  spendingInsights,
}: Props) {
  const [currentRole, setCurrentRole] = useState(currentOccupation);
  const [currentOfferCad, setCurrentOfferCad] = useState(defaultCurrentOfferCad);
  const [currentHours, setCurrentHours] = useState(defaultHours);
  const [selectedCategory, setSelectedCategory] = useState(
    spendingInsights[0]?.category ?? "",
  );
  const initialSpend = spendingInsights[0]?.medianPurchaseCad ?? 30;
  const [plannedSpendCad, setPlannedSpendCad] = useState(initialSpend);
  const [alternativeCostCad, setAlternativeCostCad] = useState(
    alternativeDefault(spendingInsights[0]?.category ?? "", initialSpend),
  );
  const [timesPerWeek, setTimesPerWeek] = useState(1);

  const comparisons = useMemo(
    () => compareEarningOpportunities(currentOfferCad, opportunities),
    [currentOfferCad, opportunities],
  );
  const best = comparisons[0];
  const selectedInsight =
    spendingInsights.find((insight) => insight.category === selectedCategory) ??
    spendingInsights[0];
  const spendDecision = useMemo(
    () =>
      calculateSpendDecision({
        plannedSpendCad,
        alternativeCostCad,
        timesPerWeek,
        hourlyNetCad,
      }),
    [alternativeCostCad, hourlyNetCad, plannedSpendCad, timesPerWeek],
  );
  const currentHourlyCad =
    currentHours > 0 ? Math.round((currentOfferCad / currentHours) * 100) / 100 : 0;

  const chooseCategory = (insight: SpendingInsight) => {
    setSelectedCategory(insight.category);
    setPlannedSpendCad(insight.medianPurchaseCad);
    setAlternativeCostCad(
      alternativeDefault(insight.category, insight.medianPurchaseCad),
    );
  };

  return (
    <View>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>EARN & SAVE</Text>
        <Text style={styles.title}>Make the next dollar count.</Text>
        <Text style={styles.body}>
          Compare a work opportunity with local historical pay, then check a
          non-essential purchase before spending.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.step}>1 · EARN MORE</Text>
        <Text style={styles.cardTitle}>Is there a better-paying option?</Text>
        <Text style={styles.cardBody}>
          Enter the take-home pay for the job or task you are considering.
        </Text>

        <Text style={styles.fieldLabel}>Current job or task</Text>
        <TextInput
          testID="growth-current-role"
          value={currentRole}
          onChangeText={setCurrentRole}
          accessibilityLabel="Current job or task"
          style={styles.textField}
        />

        <View style={styles.fieldGrid}>
          <MoneyField
            testID="growth-current-pay"
            label="Take-home per day"
            value={currentOfferCad}
            onChange={setCurrentOfferCad}
          />
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Hours</Text>
            <View style={styles.moneyField}>
              <TextInput
                testID="growth-current-hours"
                value={currentHours.toFixed(1)}
                onChangeText={(text) => setCurrentHours(parseAmount(text, 24))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                accessibilityLabel="Hours for the current job or task"
                style={[styles.moneyText, styles.hoursText]}
              />
              <Text style={styles.unit}>hrs</Text>
            </View>
          </View>
        </View>

        <View style={styles.currentSummary}>
          <View>
            <Text style={styles.miniLabel}>CURRENT OPTION</Text>
            <Text style={styles.currentRole} numberOfLines={1}>
              {currentRole || "Current work"}
            </Text>
          </View>
          <View style={styles.rightAlign}>
            <Text style={styles.miniLabel}>ABOUT</Text>
            <Text style={styles.currentHourly}>{formatCad(currentHourlyCad)}/hr</Text>
          </View>
        </View>

        {best ? (
          <>
            <View testID="best-opportunity" style={styles.bestCard}>
              <Text style={styles.bestKicker}>BEST HISTORICAL MATCH</Text>
              <Text style={styles.bestTitle}>Explore {best.occupation}</Text>
              <Text style={styles.bestPay}>
                {formatCad(best.medianDailyNetCad)}{" "}
                <Text style={styles.bestPayUnit}>median take-home per day</Text>
              </Text>
              <View style={styles.gainGrid}>
                <View style={styles.gainMetric}>
                  <Text style={styles.gainLabel}>MORE / DAY</Text>
                  <Text style={styles.gainValue}>+{formatCad(best.gainPerDayCad)}</Text>
                </View>
                <View style={styles.gainMetric}>
                  <Text style={styles.gainLabel}>5-DAY WEEK</Text>
                  <Text style={styles.gainValue}>
                    +{formatCad(best.gainPerFiveDayWeekCad)}
                  </Text>
                </View>
                <View style={styles.gainMetric}>
                  <Text style={styles.gainLabel}>MONTH</Text>
                  <Text style={styles.gainValue}>
                    +{formatCad(best.gainPerMonthCad)}
                  </Text>
                </View>
              </View>
              <Text style={styles.evidence}>
                Based on the median reported by {best.supportCount} workers in{" "}
                {best.city}.
              </Text>
            </View>

            {comparisons.slice(1).map((opportunity) => (
              <View
                key={opportunity.occupation}
                testID={`opportunity-${opportunity.occupation}`}
                style={styles.alternativeRow}
              >
                <View style={styles.opportunityIcon}>
                  <Text style={styles.opportunityIconText}>↗</Text>
                </View>
                <View style={styles.alternativeCopy}>
                  <Text style={styles.alternativeTitle}>
                    {opportunity.occupation}
                  </Text>
                  <Text style={styles.alternativeMeta}>
                    {formatCad(opportunity.medianDailyNetCad)}/day ·{" "}
                    {opportunity.supportCount} local workers
                  </Text>
                </View>
                <Text style={styles.alternativeGain}>
                  +{formatCad(opportunity.gainPerDayCad)}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <View testID="best-opportunity" style={styles.noBetterCard}>
            <Text style={styles.noBetterTitle}>This offer is competitive</Text>
            <Text style={styles.noBetterBody}>
              It pays at least as much per day as the sampled local alternatives.
            </Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          Historical worker benchmark—not a live job listing or guaranteed pay.
          Check qualifications, availability, travel, and safety before switching
          work.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.step}>2 · SAVE MORE</Text>
        <Text style={styles.cardTitle}>Pause before a want.</Text>
        <Text style={styles.cardBody}>
          Pick a category, enter what you are about to spend, and compare skipping
          it with a lower-cost choice.
        </Text>

        <View style={styles.categoryRow}>
          {spendingInsights.map((insight) => {
            const selected = insight.category === selectedCategory;
            return (
              <Pressable
                key={insight.category}
                testID={`spend-category-${insight.category}`}
                onPress={() => chooseCategory(insight)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.categoryChip, selected && styles.categoryChipSelected]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selected && styles.categoryChipTextSelected,
                  ]}
                >
                  {insight.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedInsight ? (
          <View style={styles.historyCard}>
            <Text style={styles.historyKicker}>YOUR SAMPLE HISTORY</Text>
            <Text style={styles.historyTitle}>
              {selectedInsight.purchaseCount} {selectedInsight.label.toLowerCase()}{" "}
              purchases · {formatCad(selectedInsight.totalSpentCad)} observed
            </Text>
            <Text style={styles.historyBody}>
              A typical purchase was {formatCad(selectedInsight.medianPurchaseCad)}.
              Use it as a starting point or enter your own amount.
            </Text>
          </View>
        ) : null}

        <View style={styles.fieldGrid}>
          <MoneyField
            testID="planned-spend"
            label="About to spend"
            value={plannedSpendCad}
            onChange={setPlannedSpendCad}
          />
          <MoneyField
            testID="alternative-cost"
            label="Lower-cost option"
            value={alternativeCostCad}
            onChange={setAlternativeCostCad}
          />
        </View>

        <View style={styles.frequencyRow}>
          <View>
            <Text style={styles.fieldLabel}>How often each week?</Text>
            <Text style={styles.frequencyHelper}>Used for monthly savings</Text>
          </View>
          <View style={styles.stepper}>
            <Pressable
              testID="spend-frequency-minus"
              onPress={() => setTimesPerWeek((value) => Math.max(0, value - 1))}
              accessibilityRole="button"
              style={styles.stepperButton}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <Text testID="spend-frequency-value" style={styles.stepperValue}>
              {timesPerWeek}
            </Text>
            <Pressable
              testID="spend-frequency-plus"
              onPress={() => setTimesPerWeek((value) => Math.min(14, value + 1))}
              accessibilityRole="button"
              style={styles.stepperButton}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View testID="savings-answer" style={styles.savingsAnswer}>
          <Text style={styles.savingsKicker}>LOWER-COST CHOICE</Text>
          <Text style={styles.savingsTitle}>
            Keep {formatCad(spendDecision.alternativeSavingsCad)} today
          </Text>
          <Text style={styles.savingsAlternative}>
            {selectedInsight?.suggestedAlternative ??
              "Pause and compare a lower-cost option."}
          </Text>
          <View style={styles.savingsMetrics}>
            <View style={styles.savingsMetric}>
              <Text style={styles.savingsMetricLabel}>MONTH</Text>
              <Text style={styles.savingsMetricValue}>
                {formatCad(spendDecision.monthlySavingsCad)}
              </Text>
            </View>
            <View style={styles.savingsMetric}>
              <Text style={styles.savingsMetricLabel}>YEAR</Text>
              <Text style={styles.savingsMetricValue}>
                {formatCad(spendDecision.yearlySavingsCad)}
              </Text>
            </View>
            <View style={styles.savingsMetric}>
              <Text style={styles.savingsMetricLabel}>WORK TIME</Text>
              <Text style={styles.savingsMetricValue}>
                {spendDecision.workHoursRecovered.toFixed(1)} hrs
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.choiceRow}>
          <View style={styles.choiceCard}>
            <Text style={styles.choiceNumber}>OPTION 1</Text>
            <Text style={styles.choiceTitle}>Skip it</Text>
            <Text style={styles.choiceBody}>
              Save the full {formatCad(spendDecision.skipSavingsCad)} now.
            </Text>
          </View>
          <View style={styles.choiceCard}>
            <Text style={styles.choiceNumber}>OPTION 2</Text>
            <Text style={styles.choiceTitle}>Spend less</Text>
            <Text style={styles.choiceBody}>
              Spend {formatCad(alternativeCostCad)} and keep{" "}
              {formatCad(spendDecision.alternativeSavingsCad)}.
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          The alternative cost is an editable planning assumption. Essential
          purchases should not be skipped.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 20, paddingHorizontal: 2 },
  eyebrow: {
    color: "#A16B32",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  title: {
    color: "#162C25",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1.2,
    marginTop: 8,
  },
  body: {
    color: "#6F6B64",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFEFA",
    borderColor: "#DDD8CE",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  step: {
    color: "#A16B32",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  cardTitle: {
    color: "#182D26",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 6,
  },
  cardBody: {
    color: "#77726A",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 5,
  },
  fieldWrap: { flex: 1, minWidth: 0 },
  fieldLabel: {
    color: "#585850",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 7,
  },
  textField: {
    backgroundColor: "#F2EFE8",
    borderColor: "#DDD8CE",
    borderRadius: 14,
    borderWidth: 1,
    color: "#1C3029",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  fieldGrid: { flexDirection: "row", gap: 10, marginTop: 2 },
  moneyField: {
    alignItems: "center",
    backgroundColor: "#F2EFE8",
    borderColor: "#DDD8CE",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 50,
    paddingHorizontal: 12,
  },
  currency: { color: "#8B867C", fontSize: 16, fontWeight: "800" },
  moneyText: {
    color: "#1A3028",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  hoursText: { textAlign: "right" },
  unit: { color: "#8B867C", fontSize: 10, fontWeight: "800" },
  currentSummary: {
    alignItems: "center",
    backgroundColor: "#EDF3EF",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 13,
    padding: 13,
  },
  miniLabel: {
    color: "#838078",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  currentRole: {
    color: "#26473C",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
    maxWidth: 180,
  },
  rightAlign: { alignItems: "flex-end" },
  currentHourly: {
    color: "#26473C",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  bestCard: {
    backgroundColor: "#28644F",
    borderRadius: 20,
    marginTop: 14,
    padding: 17,
  },
  bestKicker: {
    color: "#D9E9E2",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  bestTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 6,
  },
  bestPay: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 7,
  },
  bestPayUnit: { color: "#D9E9E2", fontSize: 10, fontWeight: "700" },
  gainGrid: { flexDirection: "row", gap: 6, marginTop: 14 },
  gainMetric: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    flex: 1,
    padding: 9,
  },
  gainLabel: {
    color: "#D9E9E2",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  gainValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },
  evidence: {
    color: "#D9E9E2",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 12,
  },
  alternativeRow: {
    alignItems: "center",
    borderBottomColor: "#E3DED5",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 13,
  },
  opportunityIcon: {
    alignItems: "center",
    backgroundColor: "#E8F0EC",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  opportunityIconText: { color: "#2A6652", fontSize: 15, fontWeight: "900" },
  alternativeCopy: { flex: 1, marginLeft: 10 },
  alternativeTitle: { color: "#22362F", fontSize: 12, fontWeight: "900" },
  alternativeMeta: { color: "#827E76", fontSize: 9, marginTop: 3 },
  alternativeGain: { color: "#2A6652", fontSize: 12, fontWeight: "900" },
  noBetterCard: {
    backgroundColor: "#E8F0EC",
    borderRadius: 16,
    marginTop: 14,
    padding: 15,
  },
  noBetterTitle: { color: "#285844", fontSize: 16, fontWeight: "900" },
  noBetterBody: { color: "#5B7469", fontSize: 11, lineHeight: 17, marginTop: 4 },
  disclaimer: {
    color: "#8A857C",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 13,
  },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  categoryChip: {
    backgroundColor: "#F1EEE7",
    borderColor: "#DED9CF",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  categoryChipSelected: { backgroundColor: "#285F4D", borderColor: "#285F4D" },
  categoryChipText: { color: "#68645D", fontSize: 9, fontWeight: "800" },
  categoryChipTextSelected: { color: "#FFFFFF" },
  historyCard: {
    backgroundColor: "#F7F0E6",
    borderRadius: 15,
    marginVertical: 13,
    padding: 13,
  },
  historyKicker: {
    color: "#9A672F",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  historyTitle: {
    color: "#513E2B",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 4,
  },
  historyBody: { color: "#7B6C5B", fontSize: 10, lineHeight: 15, marginTop: 4 },
  frequencyRow: {
    alignItems: "center",
    borderBottomColor: "#E4DFD5",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingBottom: 14,
  },
  frequencyHelper: { color: "#8A867E", fontSize: 9 },
  stepper: { alignItems: "center", flexDirection: "row", gap: 11 },
  stepperButton: {
    alignItems: "center",
    backgroundColor: "#EEEAE2",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepperButtonText: { color: "#315D4E", fontSize: 19, fontWeight: "900" },
  stepperValue: {
    color: "#1C322A",
    fontSize: 16,
    fontWeight: "900",
    minWidth: 18,
    textAlign: "center",
  },
  savingsAnswer: {
    backgroundColor: "#A76B32",
    borderRadius: 20,
    marginTop: 14,
    padding: 17,
  },
  savingsKicker: {
    color: "#F8E8D7",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  savingsTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 6,
  },
  savingsAlternative: {
    color: "#F8E8D7",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  savingsMetrics: { flexDirection: "row", gap: 6, marginTop: 13 },
  savingsMetric: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 10,
    flex: 1,
    padding: 9,
  },
  savingsMetricLabel: {
    color: "#F8E8D7",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  savingsMetricValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  choiceCard: {
    backgroundColor: "#F2EFE8",
    borderRadius: 15,
    flex: 1,
    padding: 13,
  },
  choiceNumber: {
    color: "#8E887E",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },
  choiceTitle: {
    color: "#253A32",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },
  choiceBody: {
    color: "#736F67",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },
});
