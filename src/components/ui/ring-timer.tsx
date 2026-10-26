import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { colors, shadow } from "../../theme/tokens";
import type { ReactNode } from "react";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 270;
const R = 120;
const C = 2 * Math.PI * R;
const STROKE = 12;

/** The 270px progress ring from the "Trabalhando" mockup. `fraction` is 0–1 of a full shift. */
export function RingTimer({ fraction, children }: { fraction: number; children: ReactNode }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(Math.min(1, Math.max(0, fraction)), { duration: 1000, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [fraction, progress]);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - progress.get()) }));
  const dot = useAnimatedProps(() => {
    const angle = -Math.PI / 2 + 2 * Math.PI * progress.get();
    return { cx: SIZE / 2 + R * Math.cos(angle), cy: SIZE / 2 + R * Math.sin(angle) };
  });

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={colors.line} strokeWidth={STROKE} />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={colors.ink}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          animatedProps={arc}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <AnimatedCircle r={7} fill={colors.accent} animatedProps={dot} />
      </Svg>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  inner: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    ...shadow.soft,
  },
});
