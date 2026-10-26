import type { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadow } from "../../theme/tokens";
import { Txt } from "./text";
import type { ComponentProps, ComponentType } from "react";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export interface TabIconProps {
  color: string;
  size: number;
}

export interface TabSpec {
  name: string;
  label: string;
  Icon: ComponentType<TabIconProps>;
}

const SPRING = { damping: 22, stiffness: 240, mass: 0.9 };

/** Floating pill navigation from the mockups: the active item grows sideways to reveal its label. */
export function PillTabBar({ state, emitter, navigateToTab, tabs }: BottomTabBarProps & { tabs: TabSpec[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {tabs.map((spec) => {
          const index = state.routes.findIndex((r) => r.name === spec.name);
          const route = state.routes[index];
          if (!route) return null;
          const active = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigateToTab(route.key);
            }
          };
          return <PillItem key={route.key} spec={spec} active={active} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

function PillItem({ spec, active, onPress }: { spec: TabSpec; active: boolean; onPress: () => void }) {
  const progress = useSharedValue(active ? 1 : 0);
  const [labelWidth, setLabelWidth] = useState(0);
  useEffect(() => {
    progress.set(withSpring(active ? 1 : 0, SPRING));
  }, [active, progress]);

  const pill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], ["rgba(20,20,20,0)", colors.ink]),
    paddingHorizontal: interpolate(progress.get(), [0, 1], [13, 18]),
  }));
  const label = useAnimatedStyle(() => ({
    width: progress.get() * labelWidth,
    marginLeft: progress.get() * 8,
    opacity: withTiming(active ? 1 : 0, { duration: active ? 220 : 90 }),
  }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.get(), [0, 1], [1, 1.06]) }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={spec.label} hitSlop={4}>
      <Animated.View style={[styles.item, pill]}>
        <Animated.View style={icon}>
          <spec.Icon color={active ? colors.white : colors.muted} size={22} />
        </Animated.View>
        <Animated.View style={[styles.label, label]}>
          <Txt size={14} weight="semibold" tone="white" numberOfLines={1} style={styles.labelText}>
            {spec.label}
          </Txt>
        </Animated.View>
      </Animated.View>
      {/* Invisible twin: measures the label's natural width before the pill reveals it. */}
      <Txt size={14} weight="semibold" numberOfLines={1} onLayout={(e) => setLabelWidth(Math.ceil(e.nativeEvent.layout.width))} style={styles.measure} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {spec.label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: 20 },
  bar: {
    flexDirection: "row",
    gap: 4,
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.nav,
    ...shadow.soft,
  },
  item: { height: 48, minWidth: 48, borderRadius: radii.pill, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  label: { overflow: "hidden", flexDirection: "row" },
  labelText: { flexShrink: 0 },
  measure: { position: "absolute", opacity: 0, left: 0, top: -1000 },
});
