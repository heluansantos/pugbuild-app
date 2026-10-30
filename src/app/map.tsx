import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../components/ui/avatar";
import { Chip } from "../components/ui/chip";
import { Txt } from "../components/ui/text";
import { CrewMap } from "../features/office/crew-map";
import { buildCrewMap } from "../features/office/map-data";
import { useLocale, useSession } from "../features/session/session";
import { api, keys } from "../lib/api";
import { formatTime } from "../lib/format";
import { t } from "../lib/i18n";
import { colors, radii } from "../theme/tokens";

/** Office map: job sites, who is at each one right now, and the live dots moving in between. */
export default function MapScreen() {
  const { me } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useLocale();
  const today = useQuery({ queryKey: keys.officeToday, queryFn: api.office.today, enabled: !!me });
  const data = useMemo(() => (today.data ? buildCrewMap(today.data, me?.company.settings.siteRadiusMeters ?? 150) : { sites: [], people: [] }), [today.data, me]);
  if (!me) return null;
  if (me.member.role === "worker") return <Redirect href="/(tabs)" />;
  const tz = me.company.settings.timezone;
  const people = [...data.people].sort((a, b) => Number(b.live) - Number(a.live) || a.name.localeCompare(b.name));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CrewMap data={data} interactive style={{ flex: 1 }} />
      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.titlePill}>
          <Txt size={14} weight="semibold" tone="white" numberOfLines={1}>
            {t("office.map.title")}
          </Txt>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.legend}>
          <Legend color={colors.accent} ring label={t("office.map.legendLive")} />
          <Legend color={colors.ink} label={t("office.map.legendPunch")} />
          <Legend color={colors.warnDot} label={t("office.map.legendFar")} />
        </View>
        <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 2 }} showsVerticalScrollIndicator={false}>
          {people.length === 0 ? (
            <Txt size={14} tone="muted" style={{ paddingVertical: 10 }}>
              {t("office.map.nobody")}
            </Txt>
          ) : (
            people.map((p) => (
              <View key={p.membershipId} style={styles.row}>
                <Avatar name={p.name} size={36} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt size={15} weight="medium" numberOfLines={1}>
                    {p.name}
                  </Txt>
                  <Txt size={13} tone="muted" numberOfLines={1}>
                    {p.siteName ?? t("office.map.noSite")} · {t(p.live ? "office.map.liveAt" : "office.map.clockedAt", { time: formatTime(new Date(p.at), tz, locale) })}
                  </Txt>
                </View>
                {p.far ? (
                  <Chip tone="warn" size="sm">
                    {t("office.team.far")}
                  </Chip>
                ) : p.live ? (
                  <Chip tone="accent" size="sm" dot>
                    {t("office.map.legendLive")}
                  </Chip>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function Legend({ color, ring, label }: { color: string; ring?: boolean; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, borderWidth: ring ? 2 : 0, borderColor: colors.ink }} />
      <Txt size={12} tone="muted">
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  titlePill: { flexShrink: 1, paddingHorizontal: 14, height: 36, borderRadius: radii.pill, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.cardLg, borderTopRightRadius: radii.cardLg, paddingHorizontal: 20, paddingTop: 14, gap: 10, marginTop: -radii.cardLg },
  legend: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
});
