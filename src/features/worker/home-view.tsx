import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Play } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { api, keys } from "../../lib/api";
import type { SiteDto } from "../../lib/api-types";
import { nearestSite } from "../../lib/geo";
import { t } from "../../lib/i18n";
import { isNetworkError, newClientId } from "../../lib/offline-queue";
import { askNotificationPermission } from "../notifications/permission";
import { registerPushToken } from "../notifications/push-token";
import { useLocale, useMe } from "../session/session";
import { NearbyCard } from "./nearby-card";
import { errorText } from "./payment-card";
import { useGeolocation } from "./use-geolocation";
import { offlineQueue } from "./use-offline-sync";
import { useTheme, useThemedStyles } from "../../theme/theme";
import type { Palette, Shadows } from "../../theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HomeView({ sites, queued }: { sites: SiteDto[]; queued: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const locale = useLocale();
  const geo = useGeolocation();
  const nearest = geo.position ? nearestSite(geo.position, sites, me.company.settings.siteRadiusMeters) : null;
  const tapping = useRef(false);
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const clockIn = useMutation({
    mutationFn: async () => {
      const payload = { location: geo.position ?? undefined, deviceAt: new Date().toISOString(), clientId: newClientId(), ownerId: me.member.id };
      try {
        return await api.punches.clockIn(payload);
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        await offlineQueue.enqueue({ kind: "clock-in", ...payload });
        return null;
      }
    },
    onSuccess: async (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast[res ? "ok" : "toast"](res ? t("worker.toasts.clockedIn") : t("worker.toasts.queued"));
      await qc.invalidateQueries({ queryKey: keys.openPunch });
      await qc.invalidateQueries({ queryKey: keys.week() });
      // The right moment to ask: the shift just started, so "remind me to clock out" makes sense.
      // Granted → the phone schedules its reminders (clock screen) and tells the server where it is.
      void askNotificationPermission().then((granted) => {
        if (granted) void registerPushToken();
      });
    },
    onError: (e) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(errorText(e));
    },
  });

  const busy = clockIn.isPending || queued;

  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.root}>
      <NearbyCard status={geo.status} nearest={nearest} hasSites={sites.length > 0} locale={locale} accuracy={geo.position?.accuracy} />
      <View style={styles.center}>
        <View style={styles.ring}>
          <AnimatedPressable
            onPress={() => {
              // Two taps inside one render must not send two clock-ins.
              if (tapping.current || clockIn.isPending) return;
              tapping.current = true;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              clockIn.mutate(undefined, { onSettled: () => (tapping.current = false) });
            }}
            onPressIn={() => {
              scale.set(withSpring(0.95, { stiffness: 400, damping: 26 }));
            }}
            onPressOut={() => {
              scale.set(withSpring(1, { stiffness: 400, damping: 26 }));
            }}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("worker.home.start")}
            style={[styles.button, busy && { opacity: 0.7 }, anim]}
          >
            <View style={styles.play}>
              <Play size={20} color={colors.onAccent} fill={colors.onAccent} />
            </View>
            <Txt size={30} weight="semibold" tone="onInk" tracking={-0.4}>
              {clockIn.isPending ? t("worker.home.starting") : t("worker.home.start")}
            </Txt>
            <Txt size={13} tone="muted3">
              {queued ? t("common.states.offline") : t("worker.home.tapToClock")}
            </Txt>
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: Palette, shadow: Shadows) =>
  StyleSheet.create({
    root: { flex: 1, gap: 14 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
    ring: { width: 248, height: 248, borderRadius: 124, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.muted3, alignItems: "center", justifyContent: "center" },
    button: { width: 212, height: 212, borderRadius: 106, backgroundColor: c.ink, alignItems: "center", justifyContent: "center", gap: 6, ...shadow.float },
    play: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", paddingLeft: 3 },
  });
