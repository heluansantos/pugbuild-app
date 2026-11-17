import { useMutation } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { FileText, Share } from "lucide-react-native";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { api, isApiError } from "../../lib/api";
import { t } from "../../lib/i18n";
import { statementFilename } from "../../lib/statement";
import { useTheme } from "../../theme/theme";
import { radii } from "../../theme/tokens";
import { useLocale } from "../session/session";
import { errorText } from "./payment-card";

/**
 * One row under the Year totals: the annual earnings statement as a PDF, straight into the
 * system share sheet (Mail, WhatsApp, Files, Print) so it reaches the accountant in two taps.
 * The server renders the document; the phone only saves it to its private cache and shares it.
 */
export function AnnualStatementRow({ year }: { year: number }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const toast = useToast();

  const share = useMutation({
    // Offline, fail with a message instead of waiting for the signal with a spinner.
    networkMode: "always",
    mutationFn: async () => {
      const { filename, base64 } = await api.statements.annual(year, locale);
      const file = new File(Paths.cache, statementFilename(filename, year));
      file.create({ overwrite: true });
      await file.write(base64, { encoding: "base64" });
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: t("worker.statement.title"),
      });
      // iOS answers when the sheet closes: the copy in the cache has done its job. Android
      // answers as soon as the chooser opens, while the other app may still be reading it.
      if (Platform.OS === "ios") {
        try {
          file.delete();
        } catch {
          // The system clears the cache folder on its own.
        }
      }
    },
    onError: (e) => toast.error(isApiError(e, "not_found") ? t("worker.statement.empty", { year }) : errorText(e)),
  });

  return (
    <Pressable
      onPress={() => share.mutate()}
      disabled={share.isPending}
      accessibilityRole="button"
      accessibilityLabel={t("worker.statement.a11y", { year })}
      accessibilityState={{ busy: share.isPending }}
      testID="annual-statement"
    >
      <Card style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.bg }]}>
          <FileText size={18} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={15} weight="semibold">
            {t("worker.statement.title")}
          </Txt>
          <Txt size={13} tone="muted">
            {t("worker.statement.hint", { year })}
          </Txt>
        </View>
        {share.isPending ? <ActivityIndicator color={colors.ink} /> : <Share size={18} color={colors.ink} />}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radii.icon, alignItems: "center", justifyContent: "center" },
});
