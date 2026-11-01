import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import type { ComponentType } from "react";
import { useTheme, useThemedStyles } from "../../theme/theme";
import { radii, type Palette } from "../../theme/tokens";
import { Txt } from "./text";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  Icon?: ComponentType<{ size?: number; color?: string }>;
  accessibilityLabel?: string;
}

interface SegmentedPillsProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 36px tall pills for dense rows; the default is the 44px touch target. */
  compact?: boolean;
  /** Share the row's width equally instead of hugging the labels. */
  stretch?: boolean;
  accessibilityLabel?: string;
}

/** Single-choice pill group (language, theme). One pill is always checked; changing it ticks the haptic. */
export function SegmentedPills<T extends string>({ options, value, onChange, compact, stretch, accessibilityLabel }: SegmentedPillsProps<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, stretch && styles.stretch]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            accessibilityState={{ checked: active, selected: active }}
            style={[styles.pill, active && styles.active, compact && styles.compact, stretch && styles.fill]}
          >
            {o.Icon && <o.Icon size={compact ? 14 : 16} color={active ? colors.onInk : colors.muted} />}
            <Txt size={compact ? 13 : 14} weight="medium" tone={active ? "onInk" : "muted"} numberOfLines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: 6, justifyContent: "center" },
    stretch: { alignSelf: "stretch" },
    pill: {
      height: 44,
      paddingHorizontal: 16,
      borderRadius: radii.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    fill: { flex: 1, paddingHorizontal: 8 },
    compact: { height: 36, paddingHorizontal: 12 },
    active: { backgroundColor: c.ink, borderColor: c.ink },
  });
