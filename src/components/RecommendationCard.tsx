import { Animated, StyleSheet, Text, View } from "react-native";
import type { RecommendationKind } from "../domain/types";
import { formatCad } from "../utils/currency";

type Props = {
  headline: string;
  reason: string;
  kind: RecommendationKind;
  savedFeeCad: number;
  animatedValue: Animated.Value;
};

const colorFor = (kind: RecommendationKind) => {
  if (kind === "covered" || kind === "wait") return "#4FE0A6";
  if (kind === "bridge") return "#F6C45C";
  return "#FF877F";
};

export function RecommendationCard({
  headline,
  reason,
  kind,
  savedFeeCad,
  animatedValue,
}: Props) {
  const color = colorFor(kind);
  return (
    <Animated.View
      testID="recommendation-card"
      style={[
        styles.card,
        { borderColor: color },
        {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.kicker, { color }]}>MONEY COACH RECOMMENDS</Text>
        <Text style={styles.spark}>✦</Text>
      </View>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.reason}>{reason}</Text>
      {kind === "wait" && savedFeeCad > 0 ? (
        <View style={[styles.savingsPill, { backgroundColor: `${color}1C` }]}>
          <Text style={[styles.savingsText, { color }]}>
            Waiting could save the {formatCad(savedFeeCad)} advance fee.
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: "#10231F",
    padding: 21,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  spark: {
    color: "#C9D5E3",
    fontSize: 17,
  },
  headline: {
    marginTop: 15,
    color: "#FAFCFF",
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -1,
  },
  reason: {
    marginTop: 10,
    color: "#B5C2D2",
    fontSize: 14,
    lineHeight: 20,
  },
  savingsPill: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
