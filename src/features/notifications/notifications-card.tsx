import { Bell } from "lucide-react-native";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { SwitchRow } from "../../components/ui/field";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { t } from "../../lib/i18n";
import { useTheme } from "../../theme/theme";
import { useMe } from "../session/session";
import { scheduleTestReminder } from "./clock-out-reminders";
import { askNotificationPermission, useNotificationPermission } from "./permission";
import { useNotificationPrefs, type NotificationKind } from "./prefs";
import { registerPushToken } from "./push-token";

const KINDS: NotificationKind[] = ["clockOutReminder", "newTask", "paymentReady"];

/** Profile card: what reaches this phone. Switches are the person's; the system permission is iOS's. */
export function NotificationsCard() {
  const me = useMe();
  const { colors } = useTheme();
  const toast = useToast();
  const { loaded: permLoaded, granted } = useNotificationPermission();
  const { prefs, set } = useNotificationPrefs(me.person.notificationPrefs);
  if (Platform.OS === "web") return null;

  const enable = async () => {
    const ok = await askNotificationPermission({ fromSettings: true });
    if (ok) void registerPushToken();
    // Refused once: iOS will not ask again, only Settings can turn it on.
    else void Linking.openSettings();
  };

  return (
    <Card size="lg" style={styles.root}>
      <View style={styles.title}>
        <Bell size={16} color={colors.muted} />
        <Txt size={13} weight="medium" tone="muted">
          {t("worker.notifications.title").toUpperCase()}
        </Txt>
      </View>
      {KINDS.map((kind) => (
        <SwitchRow key={kind} label={t(`worker.notifications.${kind}`)} value={prefs[kind]} onValueChange={(v) => set(kind, v)} />
      ))}
      <Txt size={13} tone="muted">
        {t("worker.notifications.hint")}
      </Txt>
      {permLoaded && !granted && (
        <Pressable onPress={() => void enable()} accessibilityRole="button" hitSlop={6}>
          <Txt size={14} weight="medium">
            {t("worker.notifications.enable")}
          </Txt>
        </Pressable>
      )}
      {__DEV__ && (
        <Pressable
          onPress={() => {
            void scheduleTestReminder(10);
            toast.toast(t("worker.notifications.testScheduled"));
          }}
          accessibilityRole="button"
          hitSlop={6}
        >
          <Txt size={13} tone="muted2">
            {t("worker.notifications.test")}
          </Txt>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, paddingVertical: 12 },
  title: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
});
