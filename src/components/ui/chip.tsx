import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/theme";
import { radii, type Palette } from "../../theme/tokens";
import { Txt } from "./text";

export type ChipTone = "neutral" | "ok" | "warn" | "accent" | "dark";

const tones = (c: Palette): Record<ChipTone, { bg: string; fg: string; dot?: string }> => ({
  neutral: { bg: c.nav, fg: c.ink },
  ok: { bg: c.okBg, fg: c.ok },
  warn: { bg: c.warnBg, fg: c.warn },
  accent: { bg: c.accent, fg: c.onAccent },
  dark: { bg: c.ink, fg: c.onInk, dot: c.accentOnInk },
});

export function Chip({ children, tone = "neutral", size = "md", dot }: { children: string; tone?: ChipTone; size?: "sm" | "md"; dot?: boolean }) {
  const { colors } = useTheme();
  const t = tones(colors)[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg, paddingVertical: size === "sm" ? 4 : 7, paddingHorizontal: size === "sm" ? 10 : 14 }]}>
      {dot && <View style={[styles.dot, { backgroundColor: t.dot ?? t.fg }]} />}
      <Txt size={size === "sm" ? 12 : 14} weight="medium" style={{ color: t.fg }}>
        {children}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: radii.pill, alignSelf: "flex-start" },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
