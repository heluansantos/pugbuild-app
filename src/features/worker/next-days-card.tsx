import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CalendarDays, Navigation } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Txt } from "../../components/ui/text";
import { api, keys } from "../../lib/api";
import { dayParts } from "../../lib/format";
import { t } from "../../lib/i18n";
import { relativeDay, upcomingEntries } from "../../lib/schedule";
import { useTheme, useThemedStyles } from "../../theme/theme";
import { radii, type Palette } from "../../theme/tokens";
import { useLocale } from "../session/session";
import { openSiteInMaps } from "./open-in-maps";
import { useMySchedule } from "./use-my-schedule";

/**
 * Where the person works on the coming days, as the office scheduled it. A tap opens the job
 * site, the arrow opens directions. Renders nothing while there is nothing scheduled.
 */
export function NextDaysCard() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const locale = useLocale();
  const { todayKey, entries } = useMySchedule();
  const sites = useQuery({ queryKey: keys.sites, queryFn: api.sites, staleTime: 5 * 60_000 });
  const next = upcomingEntries(entries ?? [], todayKey);
  if (next.length === 0) return null;

  const dayLabel = (key: string) => {
    const rel = relativeDay(key, todayKey);
    if (rel) return t(`worker.schedule.${rel}`);
    const { label, day } = dayParts(key, locale);
    return `${label} ${day}`;
  };

  return (
    <Card style={styles.root} testID="next-days">
      <View style={styles.title}>
        <CalendarDays size={16} color={colors.muted} />
        <Txt size={13} weight="medium" tone="muted">
          {t("worker.schedule.title").toUpperCase()}
        </Txt>
      </View>
      {next.map((e) => {
        const site = sites.data?.sites.find((s) => s.id === e.siteId);
        const name = e.siteName ?? site?.name ?? "";
        const day = dayLabel(e.dayKey);
        return (
          <View key={e.id} style={styles.row}>
            <Pressable
              style={styles.main}
              onPress={() => router.push({ pathname: "/site/[id]", params: { id: e.siteId } })}
              accessibilityRole="button"
              accessibilityLabel={t("worker.schedule.open", { day, site: name })}
            >
              <Txt size={13} weight="medium" tone="muted" style={styles.day} numberOfLines={1}>
                {day}
              </Txt>
              <View style={styles.text}>
                <Txt size={15} weight="medium" numberOfLines={1}>
                  {name}
                  {e.startTime ? (
                    <Txt size={15} tone="muted" tabular>
                      {` · ${e.startTime}`}
                    </Txt>
                  ) : null}
                </Txt>
                {e.note ? (
                  <Txt size={13} tone="muted" numberOfLines={2}>
                    {e.note}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
            {site && (
              <Pressable
                onPress={() => void openSiteInMaps(site)}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel={`${t("worker.sites.openInMaps")}: ${site.name}`}
                hitSlop={6}
              >
                <Navigation size={18} color={colors.onAccent} />
              </Pressable>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { gap: 10 },
    title: { flexDirection: "row", alignItems: "center", gap: 6 },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
    day: { width: 72 },
    text: { flex: 1, gap: 1 },
    navBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
