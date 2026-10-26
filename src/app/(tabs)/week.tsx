import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Screen, Title } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useLocale } from "../../features/session/session";
import { DayBars } from "../../features/worker/day-bars";
import { PaymentCard } from "../../features/worker/payment-card";
import { api, keys } from "../../lib/api";
import { formatMinutes, formatMoney, formatWeekRange, keyToDate } from "../../lib/format";
import { t } from "../../lib/i18n";
import { buildDayBars } from "../../lib/week-helpers";
import { colors, radii } from "../../theme/tokens";

/** Day key ± n days (keys are calendar dates, so UTC arithmetic is exact). */
function shiftKey(key: string, days: number): string {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function WeekScreen() {
  const locale = useLocale();
  const [weekKey, setWeekKey] = useState<string | undefined>(undefined);
  const week = useQuery({ queryKey: keys.week(weekKey), queryFn: () => api.week(weekKey) });
  const payments = useQuery({ queryKey: keys.payments, queryFn: api.payments.list });

  const bars = useMemo(
    () => (week.data ? buildDayBars(week.data.week.dayKeys, week.data.minutesByDay, week.data.todayKey, locale) : []),
    [week.data, locale],
  );
  const data = week.data;
  const isCurrent = !!data && data.week.startKey <= data.todayKey && data.todayKey <= data.week.endKey;
  const list = payments.data?.payments ?? [];
  const current = list.find((p) => p.status === "ready" || p.status === "disputed") ?? list.find((p) => p.status === "pending");
  const previous = list.filter((p) => p.id !== current?.id);
  const hasOpen = data?.punches.some((p) => p.status === "open");

  return (
    <Screen tabs>
      <View style={styles.header}>
        <Title>{t("worker.week.title")}</Title>
        {data && (
          <View style={styles.pager}>
            <Pressable onPress={() => setWeekKey(shiftKey(data.week.startKey, -7))} style={styles.pageBtn} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
              <ChevronLeft size={16} color={colors.ink} />
            </Pressable>
            <Txt size={13} weight="medium">
              {formatWeekRange(data.week.startKey, data.week.endKey, locale)}
            </Txt>
            <Pressable
              onPress={() => setWeekKey(shiftKey(data.week.startKey, 7))}
              disabled={isCurrent}
              style={[styles.pageBtn, isCurrent && { opacity: 0.3 }]}
              accessibilityRole="button"
              accessibilityLabel={t("common.actions.next")}
            >
              <ChevronRight size={16} color={colors.ink} />
            </Pressable>
          </View>
        )}
      </View>

      <Card size="lg" style={{ gap: 16 }}>
        {week.isPending ? (
          <ActivityIndicator color={colors.ink} style={{ height: 150 }} />
        ) : data ? (
          <>
            <View style={styles.totals}>
              <View>
                <Txt size={13} tone="muted">
                  {t("worker.week.totalHours")}
                </Txt>
                <Txt size={40} weight="semibold" tabular tracking={-1}>
                  {formatMinutes(data.totalMinutes)}
                </Txt>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Txt size={13} tone="muted">
                  {t("worker.week.gross")}
                </Txt>
                <Txt size={22} weight="semibold" tabular>
                  {formatMoney(data.grossCents, locale)}
                </Txt>
              </View>
            </View>
            <DayBars bars={bars} />
            {hasOpen && (
              <Txt size={13} tone="muted">
                {t("worker.week.openShift")}
              </Txt>
            )}
          </>
        ) : (
          <Txt size={14} tone="muted">
            {t("common.states.offline")}
          </Txt>
        )}
      </Card>

      {current && <PaymentCard payment={current} weekLabel={formatWeekRange(current.weekKey, current.endKey, locale)} locale={locale} />}

      <View style={{ gap: 8 }}>
        <Txt size={15} weight="semibold">
          {t("worker.week.previous")}
        </Txt>
        {payments.isSuccess && previous.length === 0 && !current && (
          <Txt size={14} tone="muted">
            {t("worker.week.noPayments")}
          </Txt>
        )}
        {previous.map((p) => (
          <Card key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Txt size={15} weight="medium">
                {formatWeekRange(p.weekKey, p.endKey, locale)}
              </Txt>
              <Txt size={13} tone="muted">
                {t(`worker.payments.status.${p.status}`)}
                {p.method ? ` · ${t(`common.paymentMethod.${p.method}`)}` : ""} · {formatMinutes(p.minutes)}
              </Txt>
            </View>
            <Txt size={16} weight="semibold" tabular>
              {formatMoney(p.amountCents, locale)}
            </Txt>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  pager: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, padding: 4 },
  pageBtn: { width: 36, height: 36, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  totals: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
