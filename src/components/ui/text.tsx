import { Text as RNText, StyleSheet, type TextProps } from "react-native";
import { colors, fonts } from "../../theme/tokens";

type Weight = "regular" | "medium" | "semibold";
type Tone = "ink" | "muted" | "muted2" | "muted3" | "white" | "accent" | "ok" | "warn" | "danger" | "line";

const toneColor: Record<Tone, string> = {
  ink: colors.ink,
  muted: colors.muted,
  muted2: colors.muted2,
  muted3: colors.muted3,
  white: colors.white,
  accent: colors.accent,
  ok: colors.ok,
  warn: colors.warn,
  danger: colors.danger,
  line: colors.line,
};

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
  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.3),
          fontFamily: fonts[weight],
          color: toneColor[tone],
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
