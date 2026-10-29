import { useMutation, useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { CreditCard, ExternalLink, Receipt } from "lucide-react-native";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Chip, type ChipTone } from "../../components/ui/chip";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { api, keys } from "../../lib/api";
import type { BillingStatus } from "../../lib/api-types";
import { formatMoney, formatShortDate } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import { errorText } from "../worker/payment-card";

const TONES: Record<BillingStatus, ChipTone> = { trialing: "accent", active: "ok", past_due: "warn", read_only: "warn", suspended: "warn", canceled: "neutral", comped: "neutral" };

/** Admin and office: plan status; admin also gets the Stripe portal (card, cancel, invoice history). */
export function BillingCard({ locale, timezone, isAdmin }: { locale: string; timezone: string; isAdmin: boolean }) {
  const toast = useToast();
  const overview = useQuery({ queryKey: keys.billing, queryFn: api.billing.overview, staleTime: 60_000 });
  const open = useMutation({
    mutationFn: async (kind: "portal" | "checkout") => {
      const { url } = kind === "portal" ? await api.billing.portal() : await api.billing.checkout();
      await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
      await overview.refetch();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const data = overview.data;
  if (overview.isPending) return <ActivityIndicator color={colors.ink} style={{ height: 60 }} />;
  if (!data || !data.enabled || !data.billing) return null;
  const b = data.billing;
  const date = (iso?: string) => (iso ? formatShortDate(new Date(iso), timezone, locale) : "");
  const line =
    b.status === "comped"
      ? t("office.billing.comped")
      : b.status === "trialing"
        ? t(b.hasPaymentMethod ? "office.billing.trialCard" : "office.billing.trialNoCard", { date: date(b.trialEndsAt) })
        : b.status === "past_due" || b.status === "read_only" || b.status === "suspended"
          ? t("office.billing.pastDue")
          : b.cancelAtPeriodEnd
            ? t("office.billing.cancelAtEnd", { date: date(b.currentPeriodEnd) })
            : data.estimate
              ? t("office.billing.active", { date: date(data.estimate.periodEnd), amount: formatMoney(data.estimate.quote.totalCents, locale) })
              : t("office.billing.activeNoEstimate", { date: date(b.currentPeriodEnd) });
  const needsCard = b.status === "trialing" && !b.hasPaymentMethod;

  return (
    <Card size="lg" style={{ gap: 14 }}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={13} tone="muted">
            {t("office.billing.title")}
          </Txt>
          <Txt size={15} weight="medium">
            {line}
          </Txt>
          {data.estimate && (
            <Txt size={12} tone="muted2">
              {t("office.billing.employees", { count: data.estimate.activeEmployees })}
            </Txt>
          )}
        </View>
        <Chip tone={TONES[b.status]} size="sm">
          {t(`office.billing.status.${b.status}`)}
        </Chip>
      </View>
      {isAdmin && b.status !== "comped" && (
        <View style={{ gap: 6 }}>
          <Button
            variant={needsCard ? "primary" : "secondary"}
            size="md"
            loading={open.isPending}
            leading={<CreditCard size={18} color={needsCard ? colors.white : colors.ink} />}
            onPress={() => open.mutate(needsCard || !b.hasCustomer ? "checkout" : "portal")}
          >
            {needsCard ? t("office.billing.addCard") : t("office.billing.manage")}
          </Button>
          <Txt size={12} tone="muted2" center>
            {t("office.billing.manageHint")}
          </Txt>
        </View>
      )}
      {isAdmin && data.invoices.length > 0 && (
        <View style={{ gap: 6 }}>
          <Txt size={13} weight="medium" tone="muted">
            {t("office.billing.invoices")}
          </Txt>
          {data.invoices.slice(0, 5).map((inv) => (
            <Pressable key={inv.id} onPress={() => inv.hostedInvoiceUrl && Linking.openURL(inv.hostedInvoiceUrl)} style={styles.invoice} accessibilityRole="link">
              <Receipt size={16} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="medium">
                  {inv.number || inv.id}
                </Txt>
                <Txt size={12} tone="muted">
                  {date(inv.created)} · {t(`office.billing.${inv.status === "paid" ? "paid" : inv.status === "void" ? "void" : "open"}`)}
                </Txt>
              </View>
              <Txt size={14} weight="semibold" tabular>
                {formatMoney(inv.totalCents, locale)}
              </Txt>
              {inv.hostedInvoiceUrl && <ExternalLink size={14} color={colors.muted} />}
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  invoice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radii.card, backgroundColor: colors.bg },
});
