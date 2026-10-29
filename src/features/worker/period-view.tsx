import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Txt } from "../../components/ui/text";
import { api, keys } from "../../lib/api";
import type { Period, PeriodSummaryDto } from "../../lib/api-types";
import { formatMinutes, formatMoney, toIntlLocale } from "../../lib/format";
import { t } from "../../lib/i18n";
import type { DayBar } from "../../lib/week-helpers";
import { colors, radii } from "../../theme/tokens";
import { DayBars } from "./day-bars";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function monthName(ym: string, locale: string, style: "long" | "short") {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return cap(new Intl.DateTimeFormat(toIntlLocale(locale), { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15))).replace(".", ""));
}

function headline(d: PeriodSummaryDto, locale: string) {
  if (d.period === "month") return `${monthName(d.at, locale, "long")} ${d.at.slice(0, 4)}`;
  if (d.period === "year") return d.at;
  return t("worker.week.allTime");
}

function bucketLabel(b: PeriodSummaryDto["buckets"][number], locale: string) {
  if (b.kind === "block") return String(Number(b.key.slice(8, 10)));
  if (b.kind === "month") return monthName(b.key, locale, "short").slice(0, 3);
  return b.key;
}

/** Month, year or all-time totals with one bar per block, month or year. Same card as the week. */
export function PeriodView({ period, locale, todayKey }: { period: Exclude<Period, never>; locale: string; todayKey: string }) {
  const [at, setAt] = useState<string | undefined>(undefined);
  const q = useQuery({ queryKey: keys.hours(period, at), queryFn: () => api.hours(period, at) });
  const d = q.data;

  const bars: DayBar[] = useMemo(() => {
    if (!d) return [];
    const max = Math.max(60, ...d.buckets.map((b) => b.minutes));
    const current = period === "month" ? null : period === "year" ? todayKey.slice(0, 7) : d.buckets.at(-1)?.key;
    return d.buckets.map((b) => ({ key: b.key, label: bucketLabel(b, locale), minutes: b.minutes, isToday: b.key === current, ratio: b.minutes / max }));
  }, [d, period, locale, todayKey]);

  return (
    <>
      {period !== "all" && d && (
        <View style={styles.pager}>
          <Pressable onPress={() => d.prevAt && setAt(d.prevAt)} style={styles.pageBtn} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
            <ChevronLeft size={16} color={colors.ink} />
          </Pressable>
          <Txt size={13} weight="medium">
            {headline(d, locale)}
          </Txt>
          <Pressable onPress={() => d.nextAt && setAt(d.nextAt)} disabled={!d.nextAt} style={[styles.pageBtn, !d.nextAt && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={t("common.actions.next")}>
            <ChevronRight size={16} color={colors.ink} />
          </Pressable>
        </View>
      )}
      <Card size="lg" style={{ gap: 16 }}>
        {q.isPending ? (
          <ActivityIndicator color={colors.ink} style={{ height: 150 }} />
        ) : d ? (
          <>
            <View style={styles.totals}>
              <View>
                <Txt size={13} tone="muted">
                  {period === "all" ? headline(d, locale) : t("worker.week.totalHours")}
                </Txt>
                <Txt size={40} weight="semibold" tabular tracking={-1}>
                  {formatMinutes(d.totalMinutes)}
                </Txt>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Txt size={13} tone="muted">
                  {t("worker.week.gross")}
                </Txt>
                <Txt size={22} weight="semibold" tabular>
                  {formatMoney(d.grossCents, locale)}
                </Txt>
              </View>
            </View>
            {d.buckets.length > 0 && d.totalMinutes > 0 ? (
              <DayBars bars={bars} />
            ) : (
              <Txt size={14} tone="muted">
                {t("worker.week.noHoursPeriod")}
              </Txt>
            )}
            <View style={styles.foot}>
              <Txt size={13} tone="muted">
                {t("worker.week.daysWorked", { count: d.daysWorked })}
              </Txt>
              <Txt size={13} tone="muted" tabular>
                {t("worker.week.received")} {formatMoney(d.paidCents, locale)}
              </Txt>
            </View>
          </>
        ) : (
          <Txt size={14} tone="muted">
            {t("common.states.offline")}
          </Txt>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  pager: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, padding: 4 },
  pageBtn: { width: 36, height: 36, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  totals: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  foot: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line2, paddingTop: 12 },
});
