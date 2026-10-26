import { StyleSheet, View } from "react-native";
import { colors, radii } from "../../theme/tokens";
import type { WeekStripDay } from "../../lib/week-helpers";
import { Txt } from "./text";

/** Seven pills following the company's pay week (e.g. Wed → Tue). */
export function WeekStrip({ days }: { days: WeekStripDay[] }) {
  return (
    <View style={styles.row} accessibilityRole="list">
      {days.map((d) => {
        const today = d.state === "today";
        const dashed = d.state === "off" || d.state === "future";
        return (
          <View
            key={d.key}
            style={[styles.pill, today && styles.today, !today && !dashed && styles.surface, dashed && styles.dashed]}
            accessibilityLabel={`${d.label} ${d.day}`}
          >
            <Txt size={12} tone={today ? "muted3" : "muted"}>
              {d.label}
            </Txt>
            <Txt size={16} weight="semibold" tabular tone={today ? "accent" : dashed ? "muted2" : "ink"}>
              {d.day}
            </Txt>
            <View style={[styles.dot, d.state === "worked" && { backgroundColor: colors.ink }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  pill: { flex: 1, height: 64, borderRadius: radii.card, alignItems: "center", justifyContent: "center", gap: 3 },
  today: { backgroundColor: colors.ink },
  surface: { backgroundColor: colors.surface },
  dashed: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.muted3 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" },
});
