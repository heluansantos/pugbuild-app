import { Text as RNText, StyleSheet, type TextProps } from "react-native";
import { fonts, type ColorName } from "../../theme/tokens";
import { useTheme } from "../../theme/theme";

type Weight = "regular" | "medium" | "semibold";
/** Palette entries that make sense as text colour. `onInk` is text on an `ink` surface. */
type Tone = Extract<ColorName, "ink" | "muted" | "muted2" | "muted3" | "onInk" | "onAccent" | "accent" | "accentOnInk" | "ok" | "warn" | "danger" | "line">;

export interface TxtProps extends TextProps {
  size?: number;
  weight?: Weight;
  tone?: Tone;
  /** Tabular numerals for timers and money. */
  tabular?: boolean;
  tracking?: number;
  center?: boolean;
}

/** Outfit everywhere; the only Text the app should use. */
export function Txt({ size = 15, weight = "regular", tone = "ink", tabular, tracking, center, style, ...rest }: TxtProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.3),
          fontFamily: fonts[weight],
          color: colors[tone],
        },
        tabular && styles.tabular,
        tracking !== undefined && { letterSpacing: tracking },
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
  tabular: { fontVariant: ["tabular-nums"] },
  center: { textAlign: "center" },
});
