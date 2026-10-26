import { Pressable, StyleSheet, View } from "react-native";
import { Txt } from "../../components/ui/text";
import { LOCALES, LOCALE_NAMES } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import { useSession } from "./session";

/** EN / PT / ES switch; persists and re-renders the whole app. */
export function LanguagePills({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useSession();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <Pressable
            key={l}
            onPress={() => setLocale(l)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.pill, active && styles.active, compact && { height: 36, paddingHorizontal: 12 }]}
          >
            <Txt size={compact ? 13 : 14} weight="medium" tone={active ? "white" : "muted"}>
              {compact ? l.toUpperCase() : LOCALE_NAMES[l]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, justifyContent: "center" },
  pill: { height: 44, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: colors.ink, borderColor: colors.ink },
});
