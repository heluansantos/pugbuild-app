import type { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
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

/** Floating pill navigation from the mockups: the active item expands to show its label. */
export function PillTabBar({ state, emitter, navigateToTab, tabs }: BottomTabBarProps & { tabs: TabSpec[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const spec = tabs.find((t) => t.name === route.name);
          if (!spec) return null;
          const active = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigateToTab(route.key);
            }
          };
          return (
            <Animated.View key={route.key} layout={LinearTransition.springify().stiffness(320).damping(30)}>
              <Pressable
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={spec.label}
                style={[styles.item, active && styles.active]}
                hitSlop={4}
              >
                <spec.Icon color={active ? colors.white : colors.muted} size={22} />
                {active && (
                  <Txt size={14} weight="semibold" tone="white">
                    {spec.label}
                  </Txt>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
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
  item: { height: 48, minWidth: 48, paddingHorizontal: 13, borderRadius: radii.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  active: { backgroundColor: colors.ink, paddingHorizontal: 18 },
});
