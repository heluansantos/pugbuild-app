import { useQuery } from "@tanstack/react-query";
import { Redirect, type Href } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Logo } from "../../components/brand/logo";
import { Screen } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { WeekStrip } from "../../components/ui/week-strip";
import { useMe, useLocale } from "../../features/session/session";
import { HomeView } from "../../features/worker/home-view";
import { useOfflineSync } from "../../features/worker/use-offline-sync";
import { Stat, WorkingView } from "../../features/worker/working-view";
import { api, keys } from "../../lib/api";
import { firstName, formatMinutes, formatTime, todayKeyIn } from "../../lib/format";
import type { PunchDto } from "../../lib/api-types";
import { t } from "../../lib/i18n";
import { buildWeekStrip } from "../../lib/week-helpers";
import { colors } from "../../theme/tokens";

export default function ClockScreen() {
  const me = useMe();
  if (me.member.role !== "worker") return <Redirect href={"/(tabs)/office" as Href} />;
  return <WorkerClock />;
}

function WorkerClock() {
  const me = useMe();
  const { pending, items } = useOfflineSync();
  const open = useQuery({ queryKey: keys.openPunch, queryFn: api.punches.open, refetchInterval: 5 * 60_000 });
  const week = useQuery({ queryKey: keys.week(), queryFn: () => api.week() });
  const sites = useQuery({ queryKey: keys.sites, queryFn: api.sites, staleTime: 5 * 60_000 });
  const locale = useLocale();
  const { settings } = me.company;

  const strip = useMemo(() => {
    if (!week.data) return null;
    const worked = new Set(week.data.punches.map((p) => p.dayKey));
    return buildWeekStrip(week.data.week.dayKeys, worked, week.data.todayKey, settings.workDays, locale);
  }, [week.data, settings.workDays, locale]);

  // A shift tapped without signal shows immediately (timer running from the tap); a shift ended
  // offline shows as ended. The server catches up when the queue replays.
  const queuedIn = items.find((i) => i.kind === "clock-in");
  const queuedOut = items.find((i) => i.kind === "clock-out");
  let punch: PunchDto | null = open.data ?? null;
  if (!punch && queuedIn && !queuedOut) {
    punch = {
      id: `queued-${queuedIn.id}`,
      companyId: me.company.id,
      membershipId: me.member.id,
      personId: me.person.id,
      dayKey: todayKeyIn(settings.timezone),
      weekKey: "",
      clockIn: { at: queuedIn.deviceAt, location: queuedIn.location, clientId: queuedIn.clientId },
      status: "open",
      flags: [],
    };
  } else if (punch && queuedOut) punch = null;
  const todayClosed = week.data?.punches.filter((p) => p.dayKey === week.data?.todayKey && p.status === "closed") ?? [];
  const todayMinutes = todayClosed.reduce((s, p) => s + (p.workedMinutes ?? 0), 0);
  const lastOut = todayClosed.at(-1)?.clockOut?.at;
  const firstIn = todayClosed[0]?.clockIn.at;
  const weekMinutesBefore = (week.data?.totalMinutes ?? 0) - (punch ? (week.data?.minutesByDay[punch.dayKey] ?? 0) : 0) + (punch ? todayMinutes : 0);

  return (
    <Screen tabs>
      <View style={styles.header}>
        <Logo size={44} />
      </View>

      {!punch && (
        <Txt size={26} weight="semibold" tracking={-0.4}>
          {t("worker.home.greeting", { name: firstName(me.person.name) })}
        </Txt>
      )}

      {strip && !punch && <WeekStrip days={strip} />}

      {open.isPending || sites.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : punch ? (
        <WorkingView punch={punch} sites={sites.data?.sites ?? []} weekMinutesBefore={weekMinutesBefore} />
      ) : (
        <>
          <HomeView sites={sites.data?.sites ?? []} queued={pending > 0} />
          <View style={styles.stats}>
            <Stat label={t("worker.home.clockIn")} value={firstIn ? formatTime(new Date(firstIn), settings.timezone, locale) : "—"} />
            <Stat label={t("worker.home.clockOut")} value={lastOut ? formatTime(new Date(lastOut), settings.timezone, locale) : "—"} />
            <Stat label={t("worker.home.today")} value={formatMinutes(todayMinutes)} />
          </View>
        </>
      )}
      {open.isError && (
        <Txt size={13} tone="muted" center>
          {t("common.states.offline")}
        </Txt>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 260 },
  stats: { flexDirection: "row", gap: 8 },
});
