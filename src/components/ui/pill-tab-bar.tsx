import type { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
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

const SPRING = { damping: 24, stiffness: 260, mass: 0.9 };
const LAYOUT = LinearTransition.springify().damping(24).stiffness(260).mass(0.9);

/**
 * Floating pill navigation from the mockups. The active item takes the free width of the bar
 * (so long labels never push the bar off screen) and the change of width is a spring layout animation.
 */
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
  useEffect(() => {
    progress.set(withSpring(active ? 1 : 0, SPRING));
  }, [active, progress]);
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], ["rgba(20,20,20,0)", colors.ink]),
  }));

  return (
    <Animated.View layout={LAYOUT} style={active ? styles.grow : styles.fixed}>
      <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={spec.label} hitSlop={4} style={styles.press}>
        <Animated.View style={[styles.item, fill]}>
          <spec.Icon color={active ? colors.white : colors.muted} size={22} />
          {active && (
            <Animated.View entering={FadeIn.delay(90).duration(200)} exiting={FadeOut.duration(80)} style={styles.label}>
              <Txt size={14} weight="semibold" tone="white" numberOfLines={1}>
                {spec.label}
              </Txt>
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: 20 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.nav,
    alignSelf: "stretch",
    ...shadow.soft,
  },
  fixed: { width: 48 },
  grow: { flexGrow: 1, flexBasis: 0, minWidth: 48 },
  press: { alignSelf: "stretch" },
  item: { height: 48, borderRadius: radii.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  label: { flexShrink: 1 },
});
