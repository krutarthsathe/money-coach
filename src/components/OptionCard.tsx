import { StyleSheet, Text, View } from "react-native";

type Detail = {
  label: string;
  value: string;
  accent?: boolean;
};

type Props = {
  number: string;
  title: string;
  subtitle: string;
  details: Detail[];
  recommended?: boolean;
  warning?: string;
};

export function OptionCard({
  number,
  title,
  subtitle,
  details,
  recommended,
  warning,
}: Props) {
  return (
    <View style={[styles.card, recommended && styles.recommendedCard]}>
      <View style={styles.header}>
        <View style={styles.numberCircle}>
          <Text style={styles.number}>{number}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {recommended ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BEST FIT</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.details}>
        {details.map((detail) => (
          <View style={styles.detailRow} key={detail.label}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <Text
              style={[styles.detailValue, detail.accent && styles.accentValue]}
            >
              {detail.value}
            </Text>
          </View>
        ))}
      </View>
      {warning ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#203148",
    backgroundColor: "#0E1929",
    padding: 17,
  },
  recommendedCard: {
    borderColor: "#2D9D8F",
    backgroundColor: "#0C211F",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B2A3D",
  },
  number: {
    color: "#B8C6D8",
    fontWeight: "800",
  },
  headerText: {
    flex: 1,
    marginLeft: 11,
  },
  title: {
    color: "#F2F6FA",
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    color: "#7E8EA5",
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#37D5BB",
  },
  badgeText: {
    color: "#06221E",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  details: {
    gap: 9,
    marginTop: 17,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    color: "#8190A6",
    fontSize: 12,
  },
  detailValue: {
    flexShrink: 1,
    color: "#E6EDF5",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  accentValue: {
    color: "#55E6D2",
  },
  warning: {
    marginTop: 14,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#302719",
  },
  warningText: {
    color: "#F7C66D",
    fontSize: 11,
    lineHeight: 15,
  },
});
