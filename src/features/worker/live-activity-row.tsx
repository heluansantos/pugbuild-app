import { Platform, StyleSheet } from "react-native";
import { Card } from "../../components/ui/card";
import { SwitchRow } from "../../components/ui/field";
import { Txt } from "../../components/ui/text";
import { t } from "../../lib/i18n";
import { useLiveActivityPref } from "./live-activity-pref";

/** Profile switch for the Lock Screen timer. iOS only: Live Activities do not exist elsewhere. */
export function LiveActivityRow() {
  const { enabled, set } = useLiveActivityPref();
  if (Platform.OS !== "ios") return null;
  return (
    <Card size="lg" style={styles.root}>
      <SwitchRow label={t("worker.liveActivity.settingLabel")} value={enabled} onValueChange={set} />
      <Txt size={13} tone="muted">
        {t("worker.liveActivity.settingHint")}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({ root: { gap: 4, paddingVertical: 12 } });
