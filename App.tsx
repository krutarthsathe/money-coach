import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { EvidenceModal } from "./src/components/EvidenceModal";
import { ForecastCalendar } from "./src/components/ForecastCalendar";
import { GrowthCoach } from "./src/components/GrowthCoach";
import rawDemo from "./src/data/generatedDemo.json";
import { calculateExpensePlan } from "./src/domain/decisionEngine";
import type {
  GeneratedDemo,
  UpcomingExpense,
} from "./src/domain/types";
import { formatCad } from "./src/utils/currency";

const demo = rawDemo as GeneratedDemo;
const useNativeDriver = Platform.OS !== "web";

type DemoKey = "covered" | "work" | "unexpected" | null;

const baseExpenses: UpcomingExpense[] = [
  { id: "groceries", name: "Groceries", amountCad: 85.74 },
  { id: "phone", name: "Phone bill", amountCad: 88 },
  { id: "fuel", name: "Fuel", amountCad: 45 },
];

const parseAmount = (value: string, max = 9999) => {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, max)) : 0;
};

function MoneyInput({
  label,
  helper,
  value,
  onChange,
  testID,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (value: number) => void;
  testID: string;
}) {
  return (
    <View style={styles.moneyInputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.moneyInput}>
        <Text style={styles.currencyMark}>$</Text>
        <TextInput
          testID={testID}
          style={styles.moneyInputText}
          value={value.toFixed(2)}
          onChangeText={(text) => onChange(parseAmount(text))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel={`${label} in Canadian dollars`}
        />
      </View>
      <Text style={styles.inputHelper}>{helper}</Text>
    </View>
  );
}

function DemoButton({
  title,
  subtitle,
  selected,
  onPress,
  testID,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.demoButton,
        selected && styles.demoButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.demoButtonCopy}>
        <Text style={styles.demoButtonTitle}>{title}</Text>
        <Text style={styles.demoButtonSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function ExpenseRow({
  expense,
  selected,
  onPress,
}: {
  expense: UpcomingExpense;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`expense-row-${expense.id}`}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.expenseRow,
        selected && styles.expenseRowSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.expenseIcon}>
        <Text style={styles.expenseIconText}>$</Text>
      </View>
      <Text style={styles.expenseName}>{expense.name}</Text>
      <Text style={styles.expenseAmount}>{formatCad(expense.amountCad)}</Text>
      <Text style={styles.expenseArrow}>›</Text>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, emphasis && styles.metricValueEmphasis]}>
        {value}
      </Text>
    </View>
  );
}

export default function App() {
  const [earnedToday, setEarnedToday] = useState(demo.replay.pendingPayCad);
  const [accountBalance, setAccountBalance] = useState(20);
  const [hourlyNet, setHourlyNet] = useState(demo.worker.medianHourlyNetCad);
  const [expenses, setExpenses] =
    useState<UpcomingExpense[]>(baseExpenses);
  const [selectedExpenseId, setSelectedExpenseId] =
    useState<string>("groceries");
  const [demoKey, setDemoKey] = useState<DemoKey>("work");
  const [activeView, setActiveView] =
    useState<"today" | "forecast" | "growth">("today");
  const [evidenceVisible, setEvidenceVisible] = useState(false);
  const answerAnimation = useRef(new Animated.Value(1)).current;

  const plan = useMemo(
    () =>
      calculateExpensePlan({
        earnedTodayCad: earnedToday,
        accountBalanceCad: accountBalance,
        hourlyNetCad: hourlyNet,
        expenses,
        advanceFeeRate: demo.worker.historicalMedianAdvanceFeeRate,
        historicalAdvanceAmountCad: demo.replay.needAmountCad,
        historicalAdvanceFeeCad: demo.replay.advanceFeeCad,
      }),
    [accountBalance, earnedToday, expenses, hourlyNet],
  );

  useEffect(() => {
    answerAnimation.setValue(0);
    Animated.spring(answerAnimation, {
      toValue: 1,
      speed: 25,
      bounciness: 2,
      useNativeDriver,
    }).start();
  }, [answerAnimation, plan.headline]);

  const selectedExpense =
    expenses.find((expense) => expense.id === selectedExpenseId) ?? expenses[0];

  const updateExpense = (
    id: string,
    patch: Partial<Omit<UpcomingExpense, "id">>,
  ) => {
    setExpenses((current) =>
      current.map((expense) =>
        expense.id === id ? { ...expense, ...patch } : expense,
      ),
    );
    setDemoKey(null);
  };

  const applyDemo = (key: Exclude<DemoKey, null>) => {
    setSelectedExpenseId("groceries");
    setHourlyNet(demo.worker.medianHourlyNetCad);

    if (key === "covered") {
      setEarnedToday(200);
      setAccountBalance(50);
      setExpenses(baseExpenses.map((expense) => ({ ...expense })));
    } else if (key === "unexpected") {
      setEarnedToday(demo.replay.pendingPayCad);
      setAccountBalance(20);
      setExpenses([
        ...baseExpenses.map((expense) => ({ ...expense })),
        {
          id: "repair",
          name: "Unexpected repair",
          amountCad: 120,
        },
      ]);
    } else {
      setEarnedToday(demo.replay.pendingPayCad);
      setAccountBalance(20);
      setExpenses(baseExpenses.map((expense) => ({ ...expense })));
    }
    setDemoKey(key);
  };

  const addExpense = () => {
    const id = `expense-${Date.now()}`;
    setExpenses((current) => [
      ...current,
      { id, name: "New expense", amountCad: 25 },
    ]);
    setSelectedExpenseId(id);
    setDemoKey(null);
  };

  const removeSelectedExpense = () => {
    if (!selectedExpense || expenses.length <= 1) return;
    const remaining = expenses.filter(
      (expense) => expense.id !== selectedExpense.id,
    );
    setExpenses(remaining);
    setSelectedExpenseId(remaining[0]?.id ?? "");
    setDemoKey(null);
  };

  const isCovered = plan.status === "all-covered";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F3EC" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>↗</Text>
              </View>
              <Text style={styles.brand}>Money Coach</Text>
            </View>
            <View style={styles.demoPill}>
              <Text style={styles.demoPillText}>DEMO VALUES</Text>
            </View>
          </View>

          <View style={styles.viewTabs}>
            <Pressable
              testID="view-today"
              onPress={() => setActiveView("today")}
              accessibilityRole="button"
              accessibilityState={{ selected: activeView === "today" }}
              style={[
                styles.viewTab,
                activeView === "today" && styles.viewTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.viewTabText,
                  activeView === "today" && styles.viewTabTextSelected,
                ]}
              >
                Today
              </Text>
            </Pressable>
            <Pressable
              testID="view-forecast"
              onPress={() => setActiveView("forecast")}
              accessibilityRole="button"
              accessibilityState={{ selected: activeView === "forecast" }}
              style={[
                styles.viewTab,
                activeView === "forecast" && styles.viewTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.viewTabText,
                  activeView === "forecast" && styles.viewTabTextSelected,
                ]}
              >
                Forecast
              </Text>
            </Pressable>
            <Pressable
              testID="view-growth"
              onPress={() => setActiveView("growth")}
              accessibilityRole="button"
              accessibilityState={{ selected: activeView === "growth" }}
              style={[
                styles.viewTab,
                activeView === "growth" && styles.viewTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.viewTabText,
                  activeView === "growth" && styles.viewTabTextSelected,
                ]}
              >
                Earn & save
              </Text>
            </Pressable>
          </View>

          {activeView === "forecast" ? (
            <ForecastCalendar
              hourlyNetCad={hourlyNet}
              advanceFeeRate={demo.worker.historicalMedianAdvanceFeeRate}
            />
          ) : activeView === "growth" ? (
            <GrowthCoach
              currentOccupation={demo.worker.occupation}
              city={demo.worker.city}
              defaultCurrentOfferCad={demo.replay.pendingPayCad}
              defaultHours={demo.replay.hoursWorked}
              hourlyNetCad={hourlyNet}
              opportunities={demo.growth.earningOpportunities}
              spendingInsights={demo.growth.spendingInsights}
            />
          ) : (
            <>
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>TODAY’S MONEY PLAN</Text>
            <Text style={styles.introTitle}>Do you have enough?</Text>
            <Text style={styles.introBody}>
              Add today’s earnings, account balance, and expenses. If money is
              short, compare working more with borrowing the difference.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>CHOOSE A DEMO</Text>
          <View style={styles.demoList}>
            <DemoButton
              testID="demo-covered"
              title="Everything covered"
              subtitle="$250 available for $218.74 of expenses"
              selected={demoKey === "covered"}
              onPress={() => applyDemo("covered")}
            />
            <DemoButton
              testID="demo-work"
              title="Money is short"
              subtitle="$39.03 missing: work more or borrow"
              selected={demoKey === "work"}
              onPress={() => applyDemo("work")}
            />
            <DemoButton
              testID="demo-unexpected"
              title="Unexpected expense"
              subtitle="Add a spontaneous $120 repair"
              selected={demoKey === "unexpected"}
              onPress={() => applyDemo("unexpected")}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardStep}>1 · MONEY</Text>
                <Text style={styles.cardTitle}>What do you have?</Text>
              </View>
              <Text style={styles.cadPill}>CAD</Text>
            </View>
            <View style={styles.moneyGrid}>
              <MoneyInput
                testID="earned-today-input"
                label="Earned today"
                helper="Take-home pay"
                value={earnedToday}
                onChange={(value) => {
                  setEarnedToday(value);
                  setDemoKey(null);
                }}
              />
              <MoneyInput
                testID="account-balance-input"
                label="In account"
                helper="Spendable now"
                value={accountBalance}
                onChange={(value) => {
                  setAccountBalance(value);
                  setDemoKey(null);
                }}
              />
            </View>
            <View style={styles.hourlyRow}>
              <View style={styles.hourlyCopy}>
                <Text style={styles.inputLabel}>Take-home per work hour</Text>
                <Text style={styles.inputHelper}>
                  Used to calculate extra hours
                </Text>
              </View>
              <View style={styles.hourlyInput}>
                <Text style={styles.currencyMark}>$</Text>
                <TextInput
                  testID="hourly-rate-input"
                  style={styles.hourlyInputText}
                  value={hourlyNet.toFixed(2)}
                  onChangeText={(text) => {
                    setHourlyNet(parseAmount(text, 500));
                    setDemoKey(null);
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessibilityLabel="Take-home pay per work hour"
                />
                <Text style={styles.perHour}>/hr</Text>
              </View>
            </View>
            <View style={styles.moneyEquation}>
              <Text style={styles.moneyEquationLabel}>TOTAL MONEY</Text>
              <Text style={styles.moneyEquationValue}>
                {formatCad(plan.totalResourcesCad)}
              </Text>
              <Text style={styles.moneyEquationMath}>
                {formatCad(accountBalance)} account + {formatCad(earnedToday)}{" "}
                earned
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardStep}>2 · EXPENSES</Text>
                <Text style={styles.cardTitle}>What needs to be paid?</Text>
              </View>
              <View style={styles.totalPill}>
                <Text style={styles.totalPillLabel}>TOTAL</Text>
                <Text style={styles.totalPillValue}>
                  {formatCad(plan.totalExpensesCad)}
                </Text>
              </View>
            </View>
            <Text style={styles.cardHelper}>
              Tap an expense to change its name or amount.
            </Text>
            <View style={styles.expenseList}>
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  selected={selectedExpenseId === expense.id}
                  onPress={() => setSelectedExpenseId(expense.id)}
                />
              ))}
            </View>
            <Pressable
              testID="add-expense"
              onPress={addExpense}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addExpenseButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.addExpenseIcon}>+</Text>
              <Text style={styles.addExpenseText}>Add another expense</Text>
            </Pressable>

            {selectedExpense ? (
              <View style={styles.expenseEditor}>
                <View style={styles.editorHeader}>
                  <Text style={styles.editorTitle}>Edit selected expense</Text>
                  {expenses.length > 1 ? (
                    <Pressable
                      testID="remove-expense"
                      onPress={removeSelectedExpense}
                      accessibilityRole="button"
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.editorInputs}>
                  <View style={styles.editorNameWrap}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      testID="expense-name-input"
                      value={selectedExpense.name}
                      onChangeText={(name) =>
                        updateExpense(selectedExpense.id, { name })
                      }
                      style={styles.textInput}
                      selectTextOnFocus
                      accessibilityLabel="Selected expense name"
                    />
                  </View>
                  <View style={styles.editorAmountWrap}>
                    <Text style={styles.inputLabel}>Amount</Text>
                    <View style={styles.compactMoneyInput}>
                      <Text style={styles.currencyMark}>$</Text>
                      <TextInput
                        testID="expense-amount-input"
                        value={selectedExpense.amountCad.toFixed(2)}
                        onChangeText={(text) =>
                          updateExpense(selectedExpense.id, {
                            amountCad: parseAmount(text),
                          })
                        }
                        style={styles.compactMoneyInputText}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        accessibilityLabel="Selected expense amount"
                      />
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          <Animated.View
            testID="coverage-answer"
            style={[
              styles.answerCard,
              isCovered ? styles.answerCovered : styles.answerShort,
              {
                opacity: answerAnimation,
                transform: [
                  {
                    translateY: answerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.answerHeader}>
              <Text style={styles.answerKicker}>3 · YOUR ANSWER</Text>
              <View style={styles.answerIcon}>
                <Text style={styles.answerIconText}>{isCovered ? "✓" : "!"}</Text>
              </View>
            </View>
            <Text style={styles.answerTitle}>{plan.headline}</Text>
            <Text style={styles.answerSummary}>{plan.summary}</Text>
            <View style={styles.metricsRow}>
              <Metric
                label="TOTAL MONEY"
                value={formatCad(plan.totalResourcesCad)}
              />
              <Metric
                label="EXPENSES"
                value={formatCad(plan.totalExpensesCad)}
              />
              <Metric
                label={isCovered ? "LEFT" : "MISSING"}
                value={
                  isCovered
                    ? formatCad(plan.remainingAfterExpensesCad)
                    : formatCad(plan.earningsShortfallCad)
                }
                emphasis
              />
            </View>
          </Animated.View>

          <Text style={styles.optionHeading}>
            {isCovered ? "NO EXTRA ACTION NEEDED" : "TWO WAYS TO COVER THE GAP"}
          </Text>
          <View style={styles.optionList}>
            <View testID="work-needed-card" style={styles.optionCard}>
              <View style={styles.optionTop}>
                <View style={styles.optionIcon}>
                  <Text style={styles.optionIconText}>◷</Text>
                </View>
                <Text style={styles.optionNumber}>OPTION 1</Text>
              </View>
              <Text style={styles.optionTitle}>
                {isCovered
                  ? "No extra work needed"
                  : `Work ${plan.extraHoursNeeded.toFixed(1)} more hours`}
              </Text>
              <Text style={styles.optionBody}>
                {isCovered
                  ? "Your total money already covers every listed expense."
                  : `At ${formatCad(hourlyNet)} per hour, this earns the missing ${formatCad(plan.earningsShortfallCad)}. Another option, not an obligation.`}
              </Text>
              <View style={styles.optionCostRow}>
                <Text style={styles.optionCostLabel}>FEE</Text>
                <Text style={styles.optionCostValue}>{formatCad(0)}</Text>
              </View>
            </View>

            <View testID="advance-cost-card" style={styles.optionCard}>
              <View style={styles.optionTop}>
                <View style={[styles.optionIcon, styles.loanIcon]}>
                  <Text style={styles.optionIconText}>$</Text>
                </View>
                <Text style={styles.optionNumber}>OPTION 2</Text>
              </View>
              <Text style={styles.optionTitle}>
                {isCovered
                  ? "No loan needed"
                  : `Borrow ${formatCad(plan.minimumAdvanceCad)}`}
              </Text>
              {isCovered ? (
                <Text style={styles.optionBody}>
                  A loan or cash advance would add a fee without covering a real
                  shortfall.
                </Text>
              ) : (
                <>
                  <View style={styles.loanMath}>
                    <View>
                      <Text style={styles.loanMathLabel}>YOU GET</Text>
                      <Text style={styles.loanMathValue}>
                        {formatCad(plan.minimumAdvanceCad)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.loanMathLabel}>FEE</Text>
                      <Text style={styles.loanMathValue}>
                        {formatCad(plan.advanceFeeCad)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.loanMathLabel}>REPAY</Text>
                      <Text style={styles.loanMathValue}>
                        {formatCad(plan.advanceRepaymentCad)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.optionBody}>
                    After repayment, today’s {formatCad(earnedToday)} pay would
                    become {formatCad(plan.nextPayAfterRepaymentCad)}. Borrowing
                    moves money forward; it does not create income.
                  </Text>
                </>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => setEvidenceVisible(true)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.sourceCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.sourceIcon}>
              <Text style={styles.sourceIconText}>i</Text>
            </View>
            <View style={styles.sourceCopy}>
              <Text style={styles.sourceTitle}>Sample data behind the defaults</Text>
              <Text style={styles.sourceBody}>
                All values are editable. Sample records only provide the initial
                earnings and fee rate.
              </Text>
            </View>
            <Text style={styles.sourceArrow}>›</Text>
          </Pressable>

          <Text style={styles.footer}>
            Money Coach is an educational demo, not financial advice.
          </Text>
            </>
          )}
        </View>
      </ScrollView>
      <EvidenceModal
        visible={evidenceVisible}
        onClose={() => setEvidenceVisible(false)}
        data={demo}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F3EC" },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center", paddingBottom: 48 },
  shell: {
    width: "100%",
    maxWidth: 560,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 24 : 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewTabs: {
    flexDirection: "row",
    marginTop: 20,
    padding: 4,
    borderRadius: 15,
    backgroundColor: "#E8E3D9",
  },
  viewTab: {
    flex: 1,
    minHeight: 41,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  viewTabSelected: {
    backgroundColor: "#FFFDF8",
  },
  viewTabText: {
    color: "#87837A",
    fontSize: 10,
    fontWeight: "800",
  },
  viewTabTextSelected: {
    color: "#1E6A54",
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#173D35",
  },
  logoText: { color: "#F7D978", fontSize: 21, fontWeight: "900" },
  brand: {
    marginLeft: 10,
    color: "#19302B",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  demoPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E6E0D4",
  },
  demoPillText: {
    color: "#6D665B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  intro: { marginTop: 34 },
  eyebrow: {
    color: "#A96122",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  introTitle: {
    marginTop: 9,
    color: "#172B27",
    fontSize: 35,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -1.3,
  },
  introBody: {
    marginTop: 11,
    color: "#6E706A",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    marginTop: 28,
    color: "#77736A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  demoList: { gap: 8, marginTop: 10 },
  demoButton: {
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DED8CC",
    backgroundColor: "#FBF9F4",
  },
  demoButtonSelected: {
    borderColor: "#1E6A54",
    backgroundColor: "#E8F1EC",
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#A5A49D",
  },
  radioSelected: { borderColor: "#1E6A54" },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#1E6A54",
  },
  demoButtonCopy: { marginLeft: 11 },
  demoButtonTitle: { color: "#34433E", fontSize: 12, fontWeight: "900" },
  demoButtonSubtitle: { marginTop: 3, color: "#8C8980", fontSize: 10 },
  card: {
    marginTop: 18,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DDD7CC",
    backgroundColor: "#FFFDF8",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardStep: {
    color: "#A96122",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cardTitle: {
    marginTop: 5,
    color: "#24352F",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  cardHelper: { marginTop: 8, color: "#918E85", fontSize: 10 },
  cadPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    color: "#817B70",
    fontSize: 9,
    fontWeight: "900",
    backgroundColor: "#F0ECE3",
  },
  moneyGrid: { flexDirection: "row", gap: 10, marginTop: 19 },
  moneyInputWrap: { flex: 1, minWidth: 0 },
  inputLabel: { color: "#5D625D", fontSize: 11, fontWeight: "800" },
  moneyInput: {
    height: 57,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#D7D1C6",
    backgroundColor: "#F7F4ED",
  },
  currencyMark: { color: "#817E75", fontSize: 15, fontWeight: "700" },
  moneyInputText: {
    flex: 1,
    height: "100%",
    marginLeft: 4,
    padding: 0,
    color: "#172E28",
    fontSize: 20,
    fontWeight: "900",
  },
  inputHelper: { marginTop: 5, color: "#99968D", fontSize: 9 },
  hourlyRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 17,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DDD7CC",
  },
  hourlyCopy: { flex: 1, marginRight: 10 },
  hourlyInput: {
    height: 43,
    minWidth: 119,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: "#F0ECE3",
  },
  hourlyInputText: {
    minWidth: 55,
    marginLeft: 3,
    padding: 0,
    color: "#20362F",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },
  perHour: { color: "#858178", fontSize: 9 },
  moneyEquation: {
    marginTop: 15,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#E8F1EC",
  },
  moneyEquationLabel: {
    color: "#60756C",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  moneyEquationValue: {
    marginTop: 5,
    color: "#1E6A54",
    fontSize: 21,
    fontWeight: "900",
  },
  moneyEquationMath: { marginTop: 4, color: "#75827C", fontSize: 9 },
  totalPill: {
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#E8F1EC",
  },
  totalPillLabel: {
    color: "#6E756F",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  totalPillValue: {
    marginTop: 3,
    color: "#1E6A54",
    fontSize: 13,
    fontWeight: "900",
  },
  expenseList: { gap: 8, marginTop: 15 },
  expenseRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1DCD2",
    backgroundColor: "#FAF8F3",
  },
  expenseRowSelected: {
    borderColor: "#1E6A54",
    backgroundColor: "#F0F6F2",
  },
  expenseIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#E6ECE7",
  },
  expenseIconText: { color: "#456157", fontSize: 12, fontWeight: "900" },
  expenseName: {
    flex: 1,
    marginLeft: 10,
    color: "#2E3E39",
    fontSize: 12,
    fontWeight: "900",
  },
  expenseAmount: { color: "#263A33", fontSize: 13, fontWeight: "900" },
  expenseArrow: { marginLeft: 6, color: "#9A978F", fontSize: 20 },
  addExpenseButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#BDB7AC",
  },
  addExpenseIcon: { color: "#1E6A54", fontSize: 17, fontWeight: "700" },
  addExpenseText: { color: "#5F6862", fontSize: 10, fontWeight: "800" },
  expenseEditor: {
    marginTop: 15,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#EEE9DF",
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editorTitle: { color: "#3E4944", fontSize: 11, fontWeight: "900" },
  removeText: { color: "#A4443B", fontSize: 9, fontWeight: "800" },
  editorInputs: { flexDirection: "row", gap: 9, marginTop: 12 },
  editorNameWrap: { flex: 1.3 },
  editorAmountWrap: { flex: 0.8 },
  textInput: {
    height: 45,
    marginTop: 6,
    paddingHorizontal: 11,
    borderRadius: 12,
    color: "#263934",
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "#FFFDF8",
  },
  compactMoneyInput: {
    height: 45,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: "#FFFDF8",
  },
  compactMoneyInputText: {
    flex: 1,
    marginLeft: 3,
    padding: 0,
    color: "#263934",
    fontSize: 13,
    fontWeight: "900",
  },
  answerCard: { marginTop: 18, padding: 20, borderRadius: 25 },
  answerCovered: { backgroundColor: "#1E6A54" },
  answerShort: { backgroundColor: "#A4443B" },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  answerKicker: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  answerIcon: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  answerIconText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  answerTitle: {
    marginTop: 13,
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  answerSummary: {
    marginTop: 9,
    color: "rgba(255,255,255,0.86)",
    fontSize: 12,
    lineHeight: 18,
  },
  metricsRow: { flexDirection: "row", gap: 7, marginTop: 17 },
  metric: {
    flex: 1,
    minWidth: 0,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  metricLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  metricValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  metricValueEmphasis: { color: "#FFE59A" },
  optionHeading: {
    marginTop: 27,
    color: "#77736A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  optionList: { gap: 10, marginTop: 10 },
  optionCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DDD7CC",
    backgroundColor: "#FFFDF8",
  },
  optionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#DCECE4",
  },
  loanIcon: { backgroundColor: "#F5E3D5" },
  optionIconText: { color: "#3C514A", fontSize: 15, fontWeight: "900" },
  optionNumber: {
    color: "#918C82",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  optionTitle: {
    marginTop: 13,
    color: "#21352F",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  optionBody: {
    marginTop: 8,
    color: "#73756E",
    fontSize: 10,
    lineHeight: 16,
  },
  optionCostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#F1ECE3",
  },
  optionCostLabel: { color: "#8D887E", fontSize: 8, fontWeight: "900" },
  optionCostValue: { color: "#1E6A54", fontSize: 13, fontWeight: "900" },
  loanMath: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F1ECE3",
  },
  loanMathLabel: { color: "#8D887E", fontSize: 8, fontWeight: "900" },
  loanMathValue: {
    marginTop: 4,
    color: "#A96122",
    fontSize: 14,
    fontWeight: "900",
  },
  sourceCard: {
    minHeight: 73,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#E9E3D8",
  },
  sourceIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#D8D0C2",
  },
  sourceIconText: { color: "#5E625D", fontSize: 14, fontWeight: "900" },
  sourceCopy: { flex: 1, marginLeft: 11 },
  sourceTitle: { color: "#434A46", fontSize: 11, fontWeight: "900" },
  sourceBody: {
    marginTop: 4,
    color: "#858279",
    fontSize: 9,
    lineHeight: 13,
  },
  sourceArrow: { color: "#77776F", fontSize: 24 },
  footer: {
    marginTop: 20,
    color: "#99958B",
    fontSize: 9,
    textAlign: "center",
  },
  pressed: { opacity: 0.7 },
});
