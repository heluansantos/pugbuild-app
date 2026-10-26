import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Txt } from "../../components/ui/text";
import { formatMinutes } from "../../lib/format";
import type { DayBar } from "../../lib/week-helpers";
import { colors } from "../../theme/tokens";

const MAX_H = 108;

export function DayBars({ bars }: { bars: DayBar[] }) {
  return (
    <View style={styles.grid}>
      {bars.map((b, i) => (
        <View key={b.key} style={styles.col}>
          <Txt size={11} tabular weight={b.isToday ? "semibold" : "regular"} tone={b.isToday ? "ink" : "muted"}>
            {b.minutes ? formatMinutes(b.minutes) : "—"}
          </Txt>
          <Animated.View
            entering={FadeInUp.delay(i * 40).duration(320)}
            style={[
              styles.bar,
              { height: b.minutes ? Math.max(10, b.ratio * MAX_H) : 8, backgroundColor: b.minutes ? (b.isToday ? colors.accent : colors.ink) : colors.nav },
            ]}
          />
          <Txt size={12} weight={b.isToday ? "semibold" : "regular"} tone={b.isToday ? "ink" : "muted"}>
            {b.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 8, height: 150, alignItems: "flex-end" },
  col: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  bar: { width: "100%", borderRadius: 12 },
});
