import { StyleSheet, Text, View } from "react-native";

type Props = {
  eyebrow: string;
  title: string;
  time: string;
  amount: string;
  meta: string;
  color: string;
  progress: number;
  icon: string;
};

export function ClockCard({
  eyebrow,
  title,
  time,
  amount,
  meta,
  color,
  progress,
  icon,
}: Props) {
  const clampedProgress = Math.max(0.04, Math.min(1, progress));
  return (
    <View style={[styles.card, { borderColor: `${color}66` }]}>
      <View style={styles.topRow}>
        <Text style={[styles.eyebrow, { color }]}>{eyebrow}</Text>
        <View style={[styles.iconCircle, { backgroundColor: `${color}1C` }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.time}>{time}</Text>
      <Text style={[styles.amount, { color }]}>{amount}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.progress,
            { backgroundColor: color, width: `${clampedProgress * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "#101C2D",
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    color: "#F7FBFF",
    fontSize: 15,
    fontWeight: "800",
  },
  title: {
    marginTop: 18,
    minHeight: 39,
    color: "#F5F8FC",
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  time: {
    marginTop: 6,
    color: "#91A0B6",
    fontSize: 12,
  },
  amount: {
    marginTop: 15,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  track: {
    height: 5,
    marginTop: 16,
    borderRadius: 3,
    backgroundColor: "#26364B",
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    borderRadius: 3,
  },
  meta: {
    marginTop: 9,
    minHeight: 28,
    color: "#718198",
    fontSize: 10,
    lineHeight: 14,
  },
});
