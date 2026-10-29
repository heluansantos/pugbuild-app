import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/field";
import { Sheet } from "../../components/ui/sheet";
import { Txt } from "../../components/ui/text";
import { DEFAULT_API_URL, SERVER_PRESETS, getApiUrl, setApiUrl } from "../../lib/api";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import { useSession } from "./session";

const strip = (u: string) => u.replace(/^https?:\/\//, "");

/** Hidden behind a long-press on the login logo: switch deployments for demos without rebuilding. */
export function ServerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh } = useSession();
  const [custom, setCustom] = useState("");
  const current = getApiUrl();

  async function choose(url: string | null) {
    try {
      await setApiUrl(url);
    } catch {
      return; // not an allowed server for this build
    }
    onClose();
    await refresh();
  }

  const presets = [...SERVER_PRESETS];
  if (!presets.some((p) => p.url === DEFAULT_API_URL)) presets.push({ label: "Default", url: DEFAULT_API_URL });

  return (
    <Sheet open={open} onClose={onClose} title={t("common.server.title")} description={t("common.server.description")}>
      <View style={styles.list}>
        {presets.map((p) => {
          const active = p.url === current;
          return (
            <Pressable key={p.url} onPress={() => choose(p.url === DEFAULT_API_URL ? null : p.url)} style={[styles.row, active && styles.rowActive]} accessibilityRole="button">
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={15} weight="medium">
                  {p.label}
                </Txt>
                <Txt size={12} tone="muted" numberOfLines={1}>
                  {strip(p.url)}
                </Txt>
              </View>
              {active && <Check size={18} color={colors.ink} />}
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 8 }}>
        <Txt size={13} tone="muted">
          {t("common.server.custom")}
        </Txt>
        <Input value={custom} onChangeText={setCustom} placeholder="http://192.168.0.10:3002" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Button variant="secondary" disabled={!/^https?:\/\/\S+$/.test(custom.trim())} onPress={() => choose(custom.trim())}>
          {t("common.server.apply")}
        </Button>
      </View>
      <Txt size={11} tone="muted2" center>
        {t("common.server.current")}: {strip(current)}
      </Txt>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rowActive: { borderColor: colors.ink },
});
