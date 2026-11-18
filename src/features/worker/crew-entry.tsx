import { useRouter, type Href } from "expo-router";
import { Users } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { Txt } from "../../components/ui/text";
import { t } from "../../lib/i18n";
import { useTheme, useThemedStyles } from "../../theme/theme";
import { radii, touch, type Palette } from "../../theme/tokens";

/** Way into the Crew screen, shown to crew leads on the clock tab and to staff on Today. */
export function CrewEntry() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={() => router.push("/crew" as Href)} accessibilityRole="button" accessibilityLabel={t("worker.crew.nav")} style={styles.pill}>
      <Users size={18} color={colors.ink} />
      <Txt size={14} weight="medium">
        {t("worker.crew.nav")}
      </Txt>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    pill: { flexDirection: "row", alignItems: "center", gap: 8, height: touch.min, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: c.surface },
  });
