import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Txt } from "../../components/ui/text";
import type { TodayOverview } from "../../lib/api-types";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import { CrewMap } from "./crew-map";
import { buildCrewMap } from "./map-data";

/** Slim preview of where the crew is; tap for the full map. */
export function MapCard({ overview, defaultRadius }: { overview: TodayOverview; defaultRadius: number }) {
  const router = useRouter();
  const data = useMemo(() => buildCrewMap(overview, defaultRadius), [overview, defaultRadius]);
  const onSite = data.people.filter((p) => !p.far).length;
  const away = data.people.length - onSite;
  const summary =
    data.people.length === 0
      ? t("office.map.nobody")
      : [t("office.map.onSite", { count: onSite }), away > 0 ? t("office.map.away", { count: away }) : null].filter(Boolean).join(" · ");
  return (
    <Pressable onPress={() => router.push("/map")} accessibilityRole="button" accessibilityLabel={t("office.map.open")} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <CrewMap data={data} style={styles.map} />
      <View style={styles.foot}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={15} weight="semibold">
            {t("office.map.title")}
          </Txt>
          <Txt size={13} tone="muted" numberOfLines={1}>
            {summary}
          </Txt>
        </View>
        <ChevronRight size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.cardLg, overflow: "hidden" },
  map: { height: 180 },
  foot: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
