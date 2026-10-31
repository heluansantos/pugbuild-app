import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Chip, type ChipTone } from "../../components/ui/chip";
import { Input } from "../../components/ui/field";
import { LoadError } from "../../components/ui/load-error";
import { Screen } from "../../components/ui/screen";
import { Sheet } from "../../components/ui/sheet";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { useLocale, useSession } from "../../features/session/session";
import { EXPENSE_KINDS, parseExpenseForm } from "../../features/site/expense-form";
import { errorText } from "../../features/worker/payment-card";
import { api, keys } from "../../lib/api";
import type { SiteExpenseDto, SiteExpenseKind } from "../../lib/api-types";
import { formatMinutes, formatMoney, formatShortDate, keyToDate, todayKeyIn } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

const KIND_TONES: Record<SiteExpenseKind, ChipTone> = { material: "neutral", service: "accent", other: "neutral" };

/** Admin and office: what a job site has cost (crew hours at today's rates, plus materials and services). */
export default function SiteCostsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const allowed = !!me && me.member.role !== "worker";
  const site = useQuery({ queryKey: keys.site(id), queryFn: () => api.site.get(id), enabled: !!id && allowed });
  const costs = useQuery({ queryKey: keys.siteCosts(id), queryFn: () => api.site.costs(id), enabled: !!id && allowed });
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ kind: "material" as SiteExpenseKind, description: "", amount: "", date: "", vendor: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["site", id] });
  const add = useMutation({
    mutationFn: (input: Parameters<typeof api.site.addExpense>[1]) => api.site.addExpense(id, input),
    onSuccess: async () => {
      setSheet(false);
      toast.ok(t("office.siteCosts.saved"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: (expenseId: string) => api.site.deleteExpense(id, expenseId),
    onSuccess: async () => {
      toast.ok(t("office.siteCosts.deleted"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  if (!me) return null;
  if (me.member.role === "worker") return <Redirect href="/(tabs)" />;
  const tz = me.company.settings.timezone;
  const d = costs.data;

  const openSheet = () => {
    setForm({ kind: "material", description: "", amount: "", date: todayKeyIn(tz), vendor: "" });
    setSheet(true);
  };
  const submit = () => {
    const res = parseExpenseForm(form);
    if (!res.ok) return toast.error(t(`office.siteCosts.invalid${res.error === "amount" ? "Amount" : res.error === "date" ? "Date" : "Description"}`));
    add.mutate(res.input);
  };
  const confirmDelete = (e: SiteExpenseDto) =>
    Alert.alert(t("office.siteCosts.confirmDelete"), e.description, [
      { text: t("common.actions.cancel"), style: "cancel" },
      { text: t("office.siteCosts.delete"), style: "destructive", onPress: () => remove.mutate(e.id) },
    ]);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <Screen refreshControl={<RefreshControl refreshing={costs.isRefetching} onRefresh={() => void costs.refetch()} tintColor={colors.ink} />}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <View style={{ gap: 2 }}>
          <Txt size={28} weight="semibold" tracking={-0.5}>
            {t("office.siteCosts.title")}
          </Txt>
          {site.data && (
            <Txt size={14} tone="muted" numberOfLines={1}>
              {site.data.name}
            </Txt>
          )}
        </View>

        {costs.isPending ? (
          <ActivityIndicator color={colors.ink} style={{ height: 160 }} />
        ) : !d ? (
          <LoadError onRetry={() => void costs.refetch()} />
        ) : (
          <>
            <Card size="lg" tone="ink" style={{ gap: 14 }}>
              <View style={styles.between}>
                <Txt size={13} tone="white" style={{ opacity: 0.7 }}>
                  {t("office.siteCosts.total")}
                </Txt>
                <Chip size="sm" tone="accent">
                  {t("office.siteCosts.estimate")}
                </Chip>
              </View>
              <Txt size={40} weight="semibold" tabular tracking={-1} tone="white">
                {formatMoney(d.totalCents, locale)}
              </Txt>
              <View style={styles.stats}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={13} tone="white" style={{ opacity: 0.7 }}>
                    {t("office.siteCosts.labor")}
                  </Txt>
                  <Txt size={20} weight="semibold" tabular tone="white">
                    {formatMoney(d.labor.cents, locale)}
                  </Txt>
                  <Txt size={12} tone="white" style={{ opacity: 0.7 }}>
                    {formatMinutes(d.labor.minutes)} · {t("office.siteCosts.laborPaid", { hours: formatMinutes(d.labor.paidMinutes) })}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={13} tone="white" style={{ opacity: 0.7 }}>
                    {t("office.siteCosts.expenses")}
                  </Txt>
                  <Txt size={20} weight="semibold" tabular tone="white">
                    {formatMoney(d.expenseCents, locale)}
                  </Txt>
                  {d.expenseCents > 0 && (
                    <Txt size={12} tone="white" style={{ opacity: 0.7 }} numberOfLines={2}>
                      {EXPENSE_KINDS.filter((k) => d.byKind[k] > 0)
                        .map((k) => `${t(`office.siteCosts.kinds.${k}`)} ${formatMoney(d.byKind[k], locale)}`)
                        .join(" · ")}
                    </Txt>
                  )}
                </View>
              </View>
              <Txt size={12} tone="white" style={{ opacity: 0.7 }}>
                {t("office.siteCosts.laborHint")}
              </Txt>
            </Card>

            <View style={{ gap: 8 }}>
              <Txt size={15} weight="semibold">
                {t("office.siteCosts.peopleTitle")}
              </Txt>
              {d.labor.people.length === 0 ? (
                <Txt size={14} tone="muted">
                  {t("office.siteCosts.noPeople")}
                </Txt>
              ) : (
                <Card>
                  {d.labor.people.map((p) => (
                    <View key={p.membershipId} style={styles.row}>
                      <Avatar name={p.name} photoUrl={p.photoUrl} size={40} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Txt size={15} weight="medium" numberOfLines={1}>
                          {p.name}
                        </Txt>
                        <Txt size={13} tone="muted" numberOfLines={1}>
                          {t("office.siteCosts.days", { count: p.days })} · {formatMinutes(p.minutes)}
                        </Txt>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Txt size={16} weight="semibold" tabular>
                          {formatMoney(p.cents, locale)}
                        </Txt>
                        {p.working && (
                          <Chip tone="accent" size="sm" dot>
                            {t("office.siteCosts.workingNow")}
                          </Chip>
                        )}
                      </View>
                    </View>
                  ))}
                </Card>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Txt size={15} weight="semibold">
                {t("office.siteCosts.expenses")}
              </Txt>
              <Button leading={<Plus size={18} color={colors.white} />} onPress={openSheet}>
                {t("office.siteCosts.addExpense")}
              </Button>
              {d.expenses.length === 0 ? (
                <Txt size={14} tone="muted" center style={{ paddingVertical: 12 }}>
                  {t("office.siteCosts.empty")}
                </Txt>
              ) : (
                d.expenses.map((e) => (
                  <Pressable key={e.id} onLongPress={() => confirmDelete(e)} accessibilityHint={t("office.siteCosts.delete")}>
                    <Card style={styles.expense}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Chip tone={KIND_TONES[e.kind]} size="sm">
                          {t(`office.siteCosts.kinds.${e.kind}`)}
                        </Chip>
                        <Txt size={15} weight="medium">
                          {e.description}
                        </Txt>
                        <Txt size={13} tone="muted" numberOfLines={1}>
                          {[e.vendor, formatShortDate(keyToDate(e.spentOn), "UTC", locale)].filter(Boolean).join(" · ")}
                        </Txt>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 8 }}>
                        <Txt size={16} weight="semibold" tabular>
                          {formatMoney(e.amountCents, locale)}
                        </Txt>
                        <Pressable onPress={() => confirmDelete(e)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("office.siteCosts.delete")}>
                          <Trash2 size={18} color={colors.muted} />
                        </Pressable>
                      </View>
                    </Card>
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </Screen>

      <Sheet open={sheet} onClose={() => setSheet(false)} title={t("office.siteCosts.addExpense")}>
        <View style={styles.kinds} accessibilityRole="tablist">
          {EXPENSE_KINDS.map((k) => (
            <Pressable key={k} onPress={() => set("kind", k)} accessibilityRole="tab" accessibilityState={{ selected: form.kind === k }} style={[styles.kind, form.kind === k && styles.kindActive]}>
              <Txt size={14} weight="semibold" tone={form.kind === k ? "white" : "muted"}>
                {t(`office.siteCosts.kinds.${k}`)}
              </Txt>
            </Pressable>
          ))}
        </View>
        <Input value={form.description} onChangeText={(v) => set("description", v)} placeholder={t("office.siteCosts.description")} maxLength={200} accessibilityLabel={t("office.siteCosts.description")} />
        <Input value={form.amount} onChangeText={(v) => set("amount", v)} placeholder={t("office.siteCosts.amount")} keyboardType="decimal-pad" accessibilityLabel={t("office.siteCosts.amount")} />
        <Input value={form.date} onChangeText={(v) => set("date", v)} placeholder={`${t("office.siteCosts.date")} (YYYY-MM-DD)`} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} accessibilityLabel={t("office.siteCosts.date")} />
        <Input value={form.vendor} onChangeText={(v) => set("vendor", v)} placeholder={t("office.siteCosts.vendor")} maxLength={120} accessibilityLabel={t("office.siteCosts.vendor")} />
        <Button loading={add.isPending} onPress={submit}>
          {t("office.siteCosts.save")}
        </Button>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stats: { flexDirection: "row", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  expense: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  kinds: { flexDirection: "row", gap: 2, padding: 3, borderRadius: radii.pill, backgroundColor: colors.nav },
  kind: { flex: 1, height: 38, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  kindActive: { backgroundColor: colors.ink },
});
