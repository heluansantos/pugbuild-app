import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { Screen, Title } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useMe } from "../../features/session/session";
import { api, keys } from "../../lib/api";
import { formatMinutes, formatMoney, formatWeekRange, keyToDate } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

function shiftKey(key: string, days: number): string {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Office and admin: the pay week per person, as on the web closing page (read-only on the phone). */
export default function OfficeWeekScreen() {
  const me = useMe();
  const locale = me.person.locale;
  const [weekKey, setWeekKey] = useState<string | undefined>(undefined);
  const week = useQuery({ queryKey: keys.officeWeek(weekKey), queryFn: () => api.office.week(weekKey) });
  const data = week.data;
  const todayKey = new Date().toISOString().slice(0, 10);
  const isCurrent = !!data && data.week.startKey <= todayKey && todayKey <= data.week.endKey;
  const lines = [...(data?.lines ?? [])].sort((a, b) => b.minutes - a.minutes);

  return (
    <Screen tabs refreshControl={<RefreshControl refreshing={week.isFetching && !week.isPending} onRefresh={() => void week.refetch()} tintColor={colors.ink} />}>
      <View style={styles.header}>
        <Title>{t("office.week.title")}</Title>
        {data && (
          <View style={styles.pager}>
            <Pressable onPress={() => setWeekKey(shiftKey(data.week.startKey, -7))} style={styles.pageBtn} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
              <ChevronLeft size={16} color={colors.ink} />
            </Pressable>
            <Txt size={13} weight="medium">
              {formatWeekRange(data.week.startKey, data.week.endKey, locale)}
            </Txt>
            <Pressable onPress={() => setWeekKey(shiftKey(data.week.startKey, 7))} disabled={isCurrent} style={[styles.pageBtn, isCurrent && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={t("common.actions.next")}>
              <ChevronRight size={16} color={colors.ink} />
            </Pressable>
          </View>
        )}
      </View>

      {week.isPending ? (
        <ActivityIndicator color={colors.ink} style={{ height: 160 }} />
      ) : data ? (
        <>
          <Card size="lg" tone="ink" style={{ gap: 14 }}>
            <View style={styles.totals}>
              <View>
                <Txt size={13} tone="white" style={{ opacity: 0.7 }}>
                  {t("office.week.hours")}
                </Txt>
                <Txt size={40} weight="semibold" tabular tracking={-1} tone="white">
                  {formatMinutes(data.totalMinutes)}
                </Txt>
              </View>
              <Chip tone={data.closed ? "ok" : "accent"} size="sm">
                {data.closed ? t("office.week.closed") : t("office.week.open")}
              </Chip>
            </View>
            <View style={styles.totals}>
              <View>
                <Txt size={13} tone="white" style={{ opacity: 0.7 }}>
                  {t("office.week.gross")}
                </Txt>
                <Txt size={22} weight="semibold" tabular tone="white">
                  {formatMoney(data.totalGrossCents, locale)}
                </Txt>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Txt size={13} tone="white" style={{ opacity: 0.7 }}>
                  {t("office.week.people")}
                </Txt>
                <Txt size={22} weight="semibold" tabular tone="white">
                  {String(lines.filter((l) => l.minutes > 0).length)}
                </Txt>
              </View>
            </View>
            {(data.unresolvedFlags > 0 || data.openPunches > 0) && (
              <Txt size={12} tone="white" style={{ opacity: 0.7 }}>
                {[data.unresolvedFlags > 0 ? t("office.week.flags", { count: data.unresolvedFlags }) : null, data.openPunches > 0 ? t("office.week.openPunches", { count: data.openPunches }) : null].filter(Boolean).join(" · ")}
              </Txt>
            )}
          </Card>

          <Card>
            {lines.map((l) => (
              <View key={l.membershipId} style={styles.row}>
                <Avatar name={l.name} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={15} weight="medium" numberOfLines={1}>
                    {l.name}
                  </Txt>
                  <Txt size={12} tone="muted">
                    {l.minutes > 0 ? `${formatMinutes(l.regularMinutes)}${l.overtimeMinutes > 0 ? ` + ${formatMinutes(l.overtimeMinutes)} OT` : ""} · ${formatMoney(l.hourlyRateCents, locale)}${t("office.team.perHour")}` : t("office.week.noHours")}
                  </Txt>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Txt size={16} weight="semibold" tabular>
                    {formatMoney(l.grossCents, locale)}
                  </Txt>
                  {(l.flagged > 0 || l.openPunches > 0) && (
                    <Chip tone="warn" size="sm">
                      {l.flagged > 0 ? t("office.week.flags", { count: l.flagged }) : t("office.week.openPunches", { count: l.openPunches })}
                    </Chip>
                  )}
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Txt size={14} tone="muted" center>
          {t("common.states.offline")}
        </Txt>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10 },
  pager: { flexDirection: "row", alignItems: "center", gap: 10 },
  pageBtn: { width: 32, height: 32, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  totals: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2 },
});
