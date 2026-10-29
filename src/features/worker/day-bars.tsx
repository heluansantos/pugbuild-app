import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Txt } from "../../components/ui/text";
import { formatMinutes } from "../../lib/format";
import type { DayBar } from "../../lib/week-helpers";
import { colors } from "../../theme/tokens";

const MAX_H = 108;

/** More than a week of bars (a year has 12) switches to compact labels that never wrap. */
export function DayBars({ bars }: { bars: DayBar[] }) {
  const compact = bars.length > 7;
  return (
    <View style={[styles.grid, compact && { gap: 4 }]}>
      {bars.map((b, i) => (
        <View key={b.key} style={styles.col}>
          <Txt
            size={compact ? 10 : 11}
            tabular
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            weight={b.isToday ? "semibold" : "regular"}
            tone={b.isToday ? "ink" : "muted"}
          >
            {b.minutes ? (compact ? `${Math.round(b.minutes / 60)}h` : formatMinutes(b.minutes)) : compact ? " " : "—"}
          </Txt>
          <Animated.View
            entering={FadeInUp.delay(i * 40).duration(320)}
            style={[
              styles.bar,
              { height: b.minutes ? Math.max(10, b.ratio * MAX_H) : 8, backgroundColor: b.minutes ? (b.isToday ? colors.accent : colors.ink) : colors.nav },
            ]}
          />
          <Txt size={compact ? 11 : 12} numberOfLines={1} weight={b.isToday ? "semibold" : "regular"} tone={b.isToday ? "ink" : "muted"}>
            {compact ? b.label.charAt(0) : b.label}
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
