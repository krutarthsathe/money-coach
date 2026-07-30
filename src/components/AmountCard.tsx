import { StyleSheet, Text, View } from "react-native";
import { formatCad } from "../utils/currency";

type Props = {
  label: string;
  amount: number;
  color: string;
  note: string;
  emphasized?: boolean;
};

export function AmountCard({
  label,
  amount,
  color,
  note,
  emphasized = false,
}: Props) {
  return (
    <View
      style={[styles.card, emphasized && { borderColor: color }]}
      accessibilityLabel={`${label}: ${formatCad(amount)}. ${note}`}
    >
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text
        style={[styles.amount, emphasized && styles.emphasizedAmount]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatCad(amount)}
      </Text>
      <Text style={styles.note} numberOfLines={2}>
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 108,
    padding: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1D2C3F",
    backgroundColor: "#101C2D",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    color: "#91A0B6",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  amount: {
    marginTop: 10,
    color: "#E8EEF6",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  emphasizedAmount: {
    color: "#55E6D2",
    fontSize: 19,
  },
  note: {
    marginTop: 7,
    color: "#718198",
    fontSize: 10,
    lineHeight: 13,
  },
});
