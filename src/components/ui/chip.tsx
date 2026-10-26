import { StyleSheet, View } from "react-native";
import { colors, radii } from "../../theme/tokens";
import { Txt } from "./text";

export type ChipTone = "neutral" | "ok" | "warn" | "accent" | "dark";

const tones: Record<ChipTone, { bg: string; fg: string; dot?: string }> = {
  neutral: { bg: colors.nav, fg: colors.ink },
  ok: { bg: colors.okBg, fg: colors.ok },
  warn: { bg: colors.warnBg, fg: colors.warn },
  accent: { bg: colors.accent, fg: colors.ink },
  dark: { bg: colors.ink, fg: colors.white, dot: colors.accent },
};

export function Chip({ children, tone = "neutral", size = "md", dot }: { children: string; tone?: ChipTone; size?: "sm" | "md"; dot?: boolean }) {
  const t = tones[tone];
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
