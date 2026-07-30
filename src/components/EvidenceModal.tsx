import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { GeneratedDemo } from "../domain/types";
import { formatCad } from "../utils/currency";
import { formatDuration } from "../utils/date";

type Props = {
  visible: boolean;
  onClose: () => void;
  data: GeneratedDemo;
};

const EvidenceRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export function EvidenceModal({ visible, onClose, data }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close evidence"
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>BASED ON REAL SAMPLE DATA</Text>
              <Text style={styles.title}>Why Money Coach recommended this</Text>
            </View>
            <Pressable
              style={styles.close}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close evidence"
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Linked historical records</Text>
            <View style={styles.panel}>
              <EvidenceRow
                label="Advance request"
                value={data.replay.advanceId}
              />
              <EvidenceRow label="Earnings record" value={data.replay.earningsId} />
              <EvidenceRow
                label="Deposit transaction"
                value={data.replay.depositTransactionId}
              />
              <EvidenceRow
                label="Requested amount"
                value={formatCad(data.replay.needAmountCad)}
              />
              <EvidenceRow
                label="Advance fee"
                value={formatCad(data.replay.advanceFeeCad)}
              />
              <EvidenceRow
                label="Pending pay"
                value={formatCad(data.replay.pendingPayCad)}
              />
              <EvidenceRow
                label="Actual wait"
                value={`${data.replay.actualWaitMinutes} minutes`}
              />
            </View>

            <Text style={styles.sectionTitle}>What the full sample shows</Text>
            <View style={styles.insightGrid}>
              <View style={styles.insight}>
                <Text style={styles.insightValue}>
                  {
                    data.insights
                      .advancesFollowedBySufficientPayWithin24HoursPct
                  }
                  %
                </Text>
                <Text style={styles.insightLabel}>
                  of advances were followed by a sufficient earned-pay deposit
                  within 24 hours
                </Text>
              </View>
              <View style={styles.insight}>
                <Text style={styles.insightValue}>
                  {formatDuration(data.insights.medianMinutesToNextIncomeDeposit)}
                </Text>
                <Text style={styles.insightLabel}>
                  median time from an advance request to the next income deposit
                </Text>
              </View>
            </View>
            <View style={styles.feeTotal}>
              <Text style={styles.feeTotalLabel}>Total observed advance fees</Text>
              <Text style={styles.feeTotalValue}>
                {formatCad(data.insights.totalObservedAdvanceFeesCad)}
              </Text>
            </View>
            <Text style={styles.disclaimer}>
              This is a historical replay, not a guarantee or financial advice.
              “Available now” is an adjustable demo assumption; transaction running
              balances are not treated as a single spendable account.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(23, 43, 39, 0.46)",
  },
  sheet: {
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: "#DDD7CC",
    backgroundColor: "#F8F5EE",
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 10,
    marginBottom: 18,
    borderRadius: 3,
    backgroundColor: "#B9B3A8",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: "#A96122",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    marginTop: 7,
    color: "#172B27",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  close: {
    width: 38,
    height: 38,
    marginLeft: 10,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E2D7",
  },
  closeText: {
    color: "#5E625D",
    fontSize: 25,
    lineHeight: 27,
  },
  sectionTitle: {
    marginTop: 5,
    marginBottom: 10,
    color: "#77736A",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  panel: {
    marginBottom: 22,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#FFFDF8",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0DACE",
  },
  rowLabel: {
    color: "#7D7A72",
    fontSize: 12,
  },
  rowValue: {
    color: "#263934",
    fontSize: 12,
    fontWeight: "800",
  },
  insightGrid: {
    flexDirection: "row",
    gap: 10,
  },
  insight: {
    flex: 1,
    minHeight: 132,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#E8F1EC",
  },
  insightValue: {
    color: "#1E6A54",
    fontSize: 22,
    fontWeight: "900",
  },
  insightLabel: {
    marginTop: 8,
    color: "#6E756F",
    fontSize: 11,
    lineHeight: 15,
  },
  feeTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#EEE8DD",
  },
  feeTotalLabel: {
    color: "#77736A",
    fontSize: 12,
  },
  feeTotalValue: {
    color: "#A96122",
    fontSize: 16,
    fontWeight: "900",
  },
  disclaimer: {
    marginVertical: 18,
    color: "#89867D",
    fontSize: 10,
    lineHeight: 15,
  },
});
