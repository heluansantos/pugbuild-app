import { RotateCw } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { t } from "../../lib/i18n";
import { useTheme } from "../../theme/theme";
import { Button } from "./button";
import { Txt } from "./text";

/** A failed load says so and offers a retry, instead of spinning forever. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <Txt size={15} tone="muted" center>
        {t("common.states.error")}
      </Txt>
      <Button variant="secondary" size="md" leading={<RotateCw size={16} color={colors.ink} />} onPress={onRetry}>
        {t("common.actions.retry")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: "center", gap: 12, paddingVertical: 32 } });
