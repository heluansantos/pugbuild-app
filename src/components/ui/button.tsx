import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { ReactNode } from "react";
import { colors, fonts, radii, touch } from "../../theme/tokens";
import { Txt } from "./text";

type Variant = "primary" | "secondary" | "accent" | "inverse" | "ghost" | "danger";
type Size = "md" | "lg" | "hero";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const heights: Record<Size, number> = { md: touch.min, lg: touch.primary, hero: touch.hero };

const variantStyles: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.ink, fg: colors.white },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
  accent: { bg: colors.accent, fg: colors.ink },
  inverse: { bg: colors.white, fg: colors.ink },
  ghost: { bg: "transparent", fg: colors.line, border: colors.ink3 },
  danger: { bg: colors.dangerBg, fg: colors.danger },
};

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leading?: ReactNode;
  style?: ViewStyle;
}

/** Pill button with a spring press, 44–60px tall. */
export function Button({ children, variant = "primary", size = "lg", loading, leading, style, disabled, ...rest }: ButtonProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;
  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPressIn={() => {
        scale.set(withSpring(0.96, { stiffness: 400, damping: 26 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { stiffness: 400, damping: 26 }));
      }}
      style={[
        styles.base,
        { height: heights[size], backgroundColor: v.bg, borderColor: v.border ?? "transparent" },
        isDisabled && styles.disabled,
        anim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {leading}
          {typeof children === "string" ? (
            <Txt size={size === "hero" ? 18 : 16} weight="semibold" style={{ color: v.fg, fontFamily: fonts.semibold }}>
              {children}
            </Txt>
          ) : (
            children
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  disabled: { opacity: 0.6 },
});
