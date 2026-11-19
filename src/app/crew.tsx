import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Check, MapPinOff, Users } from "lucide-react-native";
import { memo, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { LoadError } from "../components/ui/load-error";
import { Screen } from "../components/ui/screen";
import { Txt } from "../components/ui/text";
import { useToast } from "../components/ui/toast";
import { useLocale, useSession } from "../features/session/session";
import { CREW_BATCH_MAX, canUseCrew, chunk, notWorkingIds, splitSelection, summarize, toggleAllNotWorking } from "../features/worker/crew";
import { errorText } from "../features/worker/payment-card";
import { useGeolocation } from "../features/worker/use-geolocation";
import { api, keys } from "../lib/api";
import type { CrewMemberDto, CrewResult } from "../lib/api-types";
import { formatShortDate, formatTime, todayKeyIn } from "../lib/format";
import { t } from "../lib/i18n";
import { isNetworkError, newClientId } from "../lib/offline-queue";
import { useIsFocused } from "../lib/use-is-focused";
import { useTheme, useThemedStyles } from "../theme/theme";
import { radii, type Palette } from "../theme/tokens";

type Kind = "in" | "out";

/** Crew leads and staff: start and end the shift of several workers at once, at this phone's position. */
export default function CrewScreen() {
  const { me } = useSession();
  if (!me) return null;
  if (!canUseCrew(me.member)) return <Redirect href="/(tabs)" />;
  return <Crew timezone={me.company.settings.timezone} />;
}

function Crew({ timezone }: { timezone: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const focused = useIsFocused();
  const geo = useGeolocation(focused);
  const crew = useQuery({ queryKey: keys.crew, queryFn: api.crew.list });
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const members = useMemo(() => crew.data?.members ?? [], [crew.data]);
  const { toStart, toEnd } = useMemo(() => splitSelection(members, selected), [members, selected]);
  const todayKey = todayKeyIn(timezone);

  const punch = useMutation({
    // No offline queue for crew punches: the request must fail right away without signal
    // instead of waiting paused, so the lead sees it was not done.
    networkMode: "always",
    mutationFn: async ({ kind, ids }: { kind: Kind; ids: string[] }) => {
      const send = kind === "in" ? api.crew.clockIn : api.crew.clockOut;
      const results: CrewResult[] = [];
      for (const membershipIds of chunk(ids, CREW_BATCH_MAX)) {
        const res = await send({ membershipIds, location: geo.position ?? undefined, clientId: newClientId() });
        results.push(...res.results);
      }
      return { kind, ...summarize(results) };
    },
    onSuccess: ({ kind, ok, failed }) => {
      Haptics.notificationAsync(ok > 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      if (ok === 0) toast.error(t("worker.crew.noneDone"));
      else if (failed > 0) toast.toast(t("worker.crew.partial", { ok, failed }));
      else toast.ok(t(kind === "in" ? "worker.crew.started" : "worker.crew.ended", { count: ok }));
      setSelected(new Set());
    },
    onError: (e) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(isNetworkError(e) ? t("worker.crew.offline") : errorText(e));
    },
    // Whatever happened, part of a batch may have gone through: show what the server has now.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.crew });
      void qc.invalidateQueries({ queryKey: keys.officeToday });
    },
  });

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const subOf = (m: CrewMemberDto) => {
    if (!m.open) return t("worker.crew.notClockedIn");
    const since = new Date(m.open.since);
    // A shift left open on another day shows its date, or "since 7:02" would read as today.
    const time = m.open.dayKey === todayKey ? formatTime(since, timezone, locale) : `${formatShortDate(since, timezone, locale)} ${formatTime(since, timezone, locale)}`;
    return [t("worker.crew.workingSince", { time }), m.open.siteName, m.open.startedByName ? t("worker.crew.startedBy", { name: m.open.startedByName }) : null].filter(Boolean).join(" · ");
  };

  const noLocation = geo.status === "denied" || geo.status === "unavailable";
  const anyOff = notWorkingIds(members).length > 0;

  return (
    <Screen scroll={false} style={{ gap: 12 }}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
        <ArrowLeft size={22} color={colors.ink} />
      </Pressable>
      <View style={{ gap: 2 }}>
        <Txt size={28} weight="semibold" tracking={-0.5}>
          {t("worker.crew.title")}
        </Txt>
        <Txt size={14} tone="muted">
          {t("worker.crew.subtitle")}
        </Txt>
      </View>
      <View style={[styles.note, noLocation && { backgroundColor: colors.warnBg }]}>
        {noLocation && <MapPinOff size={16} color={colors.warn} />}
        <Txt size={13} tone={noLocation ? "warn" : "muted"} style={{ flex: 1 }}>
          {noLocation ? t("worker.crew.locationOff") : geo.status === "locating" ? t("worker.home.locating") : t("worker.crew.usesLocation")}
        </Txt>
      </View>

      {crew.isPending ? (
        <ActivityIndicator color={colors.ink} style={{ height: 160 }} />
      ) : !crew.data ? (
        <LoadError onRetry={() => void crew.refetch()} />
      ) : (
        <FlatList
          style={styles.list}
          data={members}
          keyExtractor={(m) => m.membershipId}
          extraData={selected}
          renderItem={({ item }) => <Row member={item} sub={subOf(item)} checked={selected.has(item.membershipId)} onToggle={toggle} />}
          refreshControl={<RefreshControl refreshing={crew.isRefetching} onRefresh={() => void crew.refetch()} tintColor={colors.ink} />}
          ListHeaderComponent={
            anyOff ? (
              <Pressable onPress={() => setSelected((prev) => toggleAllNotWorking(members, prev))} accessibilityRole="button" style={styles.selectAll}>
                <Txt size={14} weight="medium">
                  {t("worker.crew.selectAllOff")}
                </Txt>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={<EmptyState icon={<Users size={20} color={colors.ink} />} title={t("worker.crew.emptyTitle")} body={t("worker.crew.emptyBody")} />}
          contentContainerStyle={{ paddingBottom: 8 }}
        />
      )}

      {(toStart.length > 0 || toEnd.length > 0) && (
        <View style={{ gap: 8 }}>
          {toStart.length > 0 && (
            <Button variant="accent" loading={punch.isPending && punch.variables?.kind === "in"} disabled={punch.isPending} onPress={() => punch.mutate({ kind: "in", ids: toStart })}>
              {t("worker.crew.start", { count: toStart.length })}
            </Button>
          )}
          {toEnd.length > 0 && (
            <Button variant="primary" loading={punch.isPending && punch.variables?.kind === "out"} disabled={punch.isPending} onPress={() => punch.mutate({ kind: "out", ids: toEnd })}>
              {t("worker.crew.end", { count: toEnd.length })}
            </Button>
          )}
        </View>
      )}
    </Screen>
  );
}

const Row = memo(function Row({ member, sub, checked, onToggle }: { member: CrewMemberDto; sub: string; checked: boolean; onToggle: (id: string) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => onToggle(member.membershipId)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${member.name}, ${sub}`}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Check size={16} color={colors.onInk} />}</View>
      <Avatar name={member.name} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight="medium" numberOfLines={1}>
          {member.name}
        </Txt>
        <Txt size={12} tone={member.open ? "ok" : "muted"} numberOfLines={1}>
          {sub}
        </Txt>
      </View>
    </Pressable>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
    note: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.card, backgroundColor: c.surface },
    list: { flex: 1, borderRadius: radii.cardMd, backgroundColor: c.surface, paddingHorizontal: 14 },
    selectAll: { minHeight: 44, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: c.line2 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line2 },
    box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: c.muted3, alignItems: "center", justifyContent: "center" },
    boxOn: { backgroundColor: c.ink, borderColor: c.ink },
  });
