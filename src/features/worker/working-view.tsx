import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Check, MapPinOff, MessageSquare } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { SwitchRow, Textarea } from "../../components/ui/field";
import { RingTimer } from "../../components/ui/ring-timer";
import { Sheet } from "../../components/ui/sheet";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { api, keys } from "../../lib/api";
import type { PunchDto, SiteDto } from "../../lib/api-types";
import { formatClock, formatLongDate, formatMinutes, formatTime } from "../../lib/format";
import { t } from "../../lib/i18n";
import { isNetworkError, newClientId } from "../../lib/offline-queue";
import { computeElapsed } from "../../lib/time";
import { colors, radii } from "../../theme/tokens";
import { useMe, useLocale } from "../session/session";
import { errorText } from "./payment-card";
import { useGeolocation } from "./use-geolocation";
import { offlineQueue } from "./use-offline-sync";

const FULL_SHIFT_MINUTES = 8 * 60;

export function WorkingView({ punch, sites, weekMinutesBefore }: { punch: PunchDto; sites: SiteDto[]; weekMinutesBefore: number }) {
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const geo = useGeolocation();
  const { settings } = me.company;
  const locale = useLocale();
  const clockInAt = new Date(punch.clockIn.at);
  const [now, setNow] = useState(() => new Date());
  const [sheet, setSheet] = useState(false);
  const [comment, setComment] = useState(punch.clockIn.comment ?? "");
  const [notify, setNotify] = useState(punch.clockIn.notifyOffice ?? false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = computeElapsed(clockInAt, now, settings.lunch);
  const fraction = Math.min(1, elapsed.spanMinutes / FULL_SHIFT_MINUTES);
  const siteName = punch.clockIn.siteId ? (sites.find((s) => s.id === punch.clockIn.siteId)?.name ?? null) : null;
  const hasLocation = !!punch.clockIn.location;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: keys.openPunch });
    await qc.invalidateQueries({ queryKey: keys.week() });
  };

  const clockOut = useMutation({
    mutationFn: async () => {
      const payload = { location: geo.position ?? undefined, deviceAt: new Date().toISOString(), clientId: newClientId() };
      try {
        return await api.punches.clockOut(payload);
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        await offlineQueue.enqueue({ kind: "clock-out", ...payload });
        return null;
      }
    },
    onSuccess: async (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (res) toast.ok(t("worker.toasts.clockedOut", { hours: formatMinutes(res.workedMinutes ?? elapsed.workedMinutes) }));
      else toast.toast(t("worker.toasts.queued"));
      await refresh();
    },
    onError: (e) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(errorText(e));
    },
  });

  const annotate = useMutation({
    mutationFn: () => api.punches.annotate({ comment: comment.trim(), notifyOffice: notify }),
    onSuccess: async () => {
      setSheet(false);
      toast.ok(t("worker.sheets.commentSaved"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.root}>
      <View style={styles.center}>
        <Chip tone="dark" dot>
          {t("worker.home.working")}
        </Chip>
      </View>
      <View style={[styles.center, { gap: 2 }]}>
        <Txt size={15} tone="muted">
          {formatLongDate(now, settings.timezone, locale)}
        </Txt>
        <Txt size={15} tone="muted">
          {t("worker.home.startedAt", { time: formatTime(clockInAt, settings.timezone, locale) })}
        </Txt>
      </View>

      <RingTimer fraction={fraction}>
        <Txt size={13} tone="muted">
          {t("worker.home.timeToday")}
        </Txt>
        <Txt size={44} weight="semibold" tabular tracking={-1} accessibilityLiveRegion="polite">
          {formatClock(elapsed.workedMinutes)}
        </Txt>
        {elapsed.lunchDeductedMinutes > 0 && (
          <View style={styles.lunch}>
            <Txt size={12} tone="muted">
              {t("worker.home.lunchDeducted", { minutes: elapsed.lunchDeductedMinutes })}
            </Txt>
          </View>
        )}
      </RingTimer>

      <Card style={styles.siteRow}>
        <View style={[styles.icon, { backgroundColor: siteName ? colors.okBg : colors.warnBg }]}>
          {siteName ? <Check size={20} color={colors.ok} /> : <MapPinOff size={20} color={colors.warn} />}
        </View>
        <View style={{ flex: 1 }}>
          {siteName ? (
            <>
              <Txt size={13} tone="muted">
                {t("worker.home.registeredNear")}
              </Txt>
              <Txt size={16} weight="medium" numberOfLines={1}>
                {siteName}
              </Txt>
            </>
          ) : (
            <Txt size={14} tone="muted">
              {hasLocation ? t("worker.home.farFromSite") : t("worker.home.noLocationPunch")}
            </Txt>
          )}
        </View>
      </Card>

      <Pressable onPress={() => setSheet(true)} style={styles.secondary} accessibilityRole="button">
        <MessageSquare size={20} color={colors.ink} />
        <Txt size={15} weight="medium">
          {t("worker.home.comment")}
        </Txt>
      </Pressable>

      <View style={styles.stats}>
        <Stat label={t("worker.home.clockIn")} value={formatTime(clockInAt, settings.timezone, locale)} />
        <Stat label={t("worker.home.clockOut")} value="—" />
        <Stat label={t("worker.home.week")} value={formatMinutes(weekMinutesBefore + elapsed.workedMinutes)} />
      </View>

      <Button size="hero" loading={clockOut.isPending} onPress={() => clockOut.mutate()}>
        {clockOut.isPending ? t("worker.home.finishing") : t("worker.home.finish")}
      </Button>

      <Sheet open={sheet} onClose={() => setSheet(false)} title={t("worker.sheets.commentTitle")} description={t("worker.sheets.commentDescription")}>
        <Textarea value={comment} onChangeText={setComment} placeholder={t("worker.sheets.commentPlaceholder")} autoFocus />
        <SwitchRow label={t("worker.sheets.notifyOffice")} value={notify} onValueChange={setNotify} />
        <Button loading={annotate.isPending} onPress={() => annotate.mutate()}>
          {t("common.actions.save")}
        </Button>
      </Sheet>
    </Animated.View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, gap: 2 }}>
      <Txt size={12} tone="muted">
        {label}
      </Txt>
      <Txt size={18} weight="semibold" tabular>
        {value}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 14 },
  center: { alignItems: "center" },
  lunch: { backgroundColor: colors.bg, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radii.icon, alignItems: "center", justifyContent: "center" },
  secondary: { height: 50, borderRadius: radii.pill, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  stats: { flexDirection: "row", gap: 8 },
});
