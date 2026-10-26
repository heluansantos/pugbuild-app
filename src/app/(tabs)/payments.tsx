import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Card } from "../../components/ui/card";
import { Chip, type ChipTone } from "../../components/ui/chip";
import { EmptyState } from "../../components/ui/empty-state";
import { Screen, Title } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useLocale } from "../../features/session/session";
import { api, keys } from "../../lib/api";
import { formatMinutes, formatMoney, formatWeekRange } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

const tones: Record<string, ChipTone> = { pending: "neutral", ready: "accent", confirmed: "ok", disputed: "warn" };

export default function PaymentsScreen() {
  const locale = useLocale();
  const payments = useQuery({ queryKey: keys.payments, queryFn: api.payments.list });
  const list = payments.data?.payments ?? [];
  return (
    <Screen tabs>
      <Title>{t("worker.payments.title")}</Title>
      {payments.isPending && <ActivityIndicator color={colors.ink} />}
      {payments.isSuccess && list.length === 0 && (
        <EmptyState icon={<CreditCard size={20} color={colors.ink} />} title={t("common.states.empty")} body={t("worker.payments.empty")} />
      )}
      {list.map((p, i) => (
        <Animated.View key={p.id} entering={FadeInUp.delay(i * 40).duration(300)}>
          <Card style={styles.row}>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt size={15} weight="medium">
                {formatWeekRange(p.weekKey, p.endKey, locale)}
              </Txt>
              <View style={styles.meta}>
                <Chip tone={tones[p.status] ?? "neutral"} size="sm">
                  {t(`worker.payments.status.${p.status}`)}
                </Chip>
                <Txt size={13} tone="muted">
                  {p.method ? `${t(`common.paymentMethod.${p.method}`)} · ` : ""}
                  {formatMinutes(p.minutes)}
                </Txt>
              </View>
            </View>
            <Txt size={16} weight="semibold" tabular>
              {formatMoney(p.amountCents, locale)}
            </Txt>
          </Card>
        </Animated.View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
});
