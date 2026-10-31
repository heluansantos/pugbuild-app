import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Logo } from "../../components/brand/logo";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { Screen } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { MapCard } from "../../features/office/map-card";
import { ReviewCard } from "../../features/office/review-card";
import { TeamRow } from "../../features/office/team-row";
import { useMe, useLocale } from "../../features/session/session";
import { api, keys } from "../../lib/api";
import { firstName, formatMinutes, formatMoney, formatShortDate, keyToDate } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

const COLLAPSED = 3;

/** Office and admin home: the web dashboard's "Today", sized for a phone. */
export default function OfficeTodayScreen() {
  const me = useMe();
  const locale = useLocale();
  const { timezone } = me.company.settings;
  const today = useQuery({ queryKey: keys.officeToday, queryFn: api.office.today, refetchInterval: 5 * 60_000 });
  const [expanded, setExpanded] = useState(false);
  const data = today.data;
  const review = data?.review ?? [];
  const visible = expanded ? review : review.slice(0, COLLAPSED);
  const team = [...(data?.team ?? [])].sort((a, b) => Number(b.status === "working") - Number(a.status === "working") || b.minutes - a.minutes);

  return (
    <Screen tabs>
      <View style={styles.header}>
        <Logo size={44} />
        <Chip tone="dark" size="sm">
          {t(`common.roles.${me.member.role}`)}
        </Chip>
      </View>
      <View style={{ gap: 4 }}>
        <Txt size={26} weight="semibold" tracking={-0.4}>
          {t("office.today.greeting", { name: firstName(me.person.name) })}
        </Txt>
        <Txt size={14} tone="muted">
          {me.company.name}
          {data ? ` · ${t("office.today.nextClosing", { date: formatShortDate(keyToDate(data.weekEndKey), "UTC", locale), pay: formatShortDate(keyToDate(data.payDateKey), "UTC", locale) })}` : ""}
        </Txt>
      </View>

      {today.isPending ? (
        <ActivityIndicator color={colors.ink} style={{ height: 200 }} />
      ) : data ? (
        <>
          <View style={styles.kpis}>
            <Kpi label={t("office.today.kpiWorking")} value={String(data.workingNow)} sub={t("office.today.kpiOf", { total: data.activeMembers })} dark />
            <Kpi label={t("office.today.kpiCost")} value={formatMoney(data.costTodayCents, locale)} />
          </View>
          <View style={styles.kpis}>
            <Kpi label={t("office.today.kpiWeek")} value={formatMinutes(data.weekMinutes)} />
            <Kpi label={t("office.today.kpiReview")} value={String(review.length)} warn={review.length > 0} />
          </View>

          <MapCard overview={data} defaultRadius={me.company.settings.siteRadiusMeters} />

          <Txt size={18} weight="semibold">
            {t("office.review.title")}
          </Txt>
          {review.length === 0 ? (
            <Txt size={14} tone="muted">
              {t("office.review.empty")}
            </Txt>
          ) : (
            <View style={{ gap: 8 }}>
              {visible.map((item, i) => (
                <ReviewCard key={item.kind === "suggested_site" ? item.suggestion.id : `${item.kind}-${item.punch.id}`} item={item} timezone={timezone} locale={locale} />
              ))}
              {review.length > COLLAPSED && (
                <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: 6 }}>
                  <Txt size={14} weight="medium">
                    {expanded ? t("office.review.showLess") : t("office.review.showMore", { count: review.length - COLLAPSED })}
                  </Txt>
                </Pressable>
              )}
            </View>
          )}

          <Txt size={18} weight="semibold">
            {t("office.team.today")}
          </Txt>
          <Card>
            {team.map((row) => (
              <TeamRow key={row.membershipId} row={row} timezone={timezone} locale={locale} />
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

function Kpi({ label, value, sub, dark, warn }: { label: string; value: string; sub?: string; dark?: boolean; warn?: boolean }) {
  const tone = dark ? "white" : "ink";
  return (
    <Card tone={dark ? "ink" : "surface"} style={[styles.kpi, warn && { backgroundColor: colors.warnBg }]}>
      <Txt size={12} tone={dark ? "white" : "muted"} style={dark ? { opacity: 0.7 } : undefined}>
        {label}
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Txt size={28} weight="semibold" tabular tracking={-0.6} tone={tone}>
          {value}
        </Txt>
        {sub && (
          <Txt size={12} tone={dark ? "white" : "muted"} style={dark ? { opacity: 0.7 } : undefined}>
            {sub}
          </Txt>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kpis: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, gap: 4 },
});
