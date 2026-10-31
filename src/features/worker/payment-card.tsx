import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Textarea } from "../../components/ui/field";
import { Sheet } from "../../components/ui/sheet";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { api, isApiError, keys } from "../../lib/api";
import type { PaymentDto } from "../../lib/api-types";
import { formatLunch, formatMinutes, formatMoney } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

export function errorText(e: unknown): string {
  return t(`errors.${isApiError(e) ? e.code : "unknown"}`);
}

export function PaymentCard({ payment, weekLabel, locale }: { payment: PaymentDto; weekLabel: string; locale: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.payments });
  const confirm = useMutation({
    mutationFn: () => api.payments.confirm(payment.id),
    onSuccess: () => {
      toast.ok(t("worker.toasts.confirmed"));
      invalidate();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const dispute = useMutation({
    mutationFn: () => api.payments.dispute(payment.id, note.trim()),
    onSuccess: () => {
      setOpen(false);
      toast.ok(t("worker.toasts.disputed"));
      invalidate();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const headline = payment.status === "ready" ? t("worker.week.paymentReady") : payment.status === "disputed" ? t("worker.week.paymentDisputed") : t("worker.week.paymentPending");
  const actionable = payment.status === "ready" || payment.status === "disputed";

  return (
    <>
      <Card size="lg" tone="ink" style={{ gap: 14 }}>
        <View style={styles.between}>
          <View style={styles.inline}>
            <View style={[styles.dot, { backgroundColor: payment.status === "disputed" ? colors.warnDot : colors.accent }]} />
            <Txt size={15} weight="medium" tone="white">
              {headline}
            </Txt>
          </View>
          {payment.method && (
            <View style={styles.method}>
              <Txt size={13} weight="semibold">
                {t(`common.paymentMethod.${payment.method}`)}
              </Txt>
            </View>
          )}
        </View>
        <View>
          <Txt size={30} weight="semibold" tone="white" tabular tracking={-0.5}>
            {formatMoney(payment.amountCents, locale)}
          </Txt>
          <Txt size={14} tone="muted3">
            {[
              weekLabel,
              t("worker.week.worked", { hours: formatMinutes(payment.workedMinutes ?? payment.minutes + (payment.lunchMinutes ?? 0)) }),
              ...(payment.lunchMinutes ? [t("worker.week.paidAfterLunch", { paid: formatMinutes(payment.minutes), lunch: formatLunch(payment.lunchMinutes) })] : []),
            ].join(" · ")}
          </Txt>
        </View>
        {payment.pickupNote && (
          <View style={styles.pickup}>
            <MapPin size={20} color={colors.muted3} />
            <Txt size={14} tone="line" style={{ flex: 1 }}>
              {payment.pickupNote}
            </Txt>
          </View>
        )}
        {actionable && (
          <>
            <Button variant="inverse" loading={confirm.isPending} onPress={() => confirm.mutate()}>
              {t("worker.week.confirmReceived")}
            </Button>
            {payment.status === "ready" && (
              <Button variant="ghost" size="md" onPress={() => setOpen(true)}>
                {t("worker.week.problem")}
              </Button>
            )}
          </>
        )}
      </Card>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("worker.week.problemTitle")} description={t("worker.week.problemDescription")}>
        <Textarea value={note} onChangeText={setNote} placeholder={t("worker.week.problemPlaceholder")} autoFocus />
        <Button loading={dispute.isPending} disabled={note.trim().length < 3} onPress={() => dispute.mutate()}>
          {t("worker.week.send")}
        </Button>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  method: { backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pickup: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.ink2, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
});
