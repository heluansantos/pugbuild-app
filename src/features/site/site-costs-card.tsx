import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Txt } from "../../components/ui/text";
import { api, keys } from "../../lib/api";
import { formatMinutes, formatMoney } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

/** Admin and office only: what this site has cost so far; tap for the full breakdown. */
export function SiteCostsCard({ siteId, locale }: { siteId: string; locale: string }) {
  const router = useRouter();
  const costs = useQuery({ queryKey: keys.siteCosts(siteId), queryFn: () => api.site.costs(siteId) });
  const d = costs.data;
  if (!d) return null;
  return (
    <View style={styles.pad}>
      <Pressable
        onPress={() => router.push({ pathname: "/site-costs/[id]", params: { id: siteId } })}
        accessibilityRole="button"
        accessibilityLabel={t("office.siteCosts.open")}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.between}>
          <Txt size={15} weight="semibold">
            {t("office.siteCosts.title")}
            <Txt size={13} tone="muted">{`  ${t("office.siteCosts.estimate").toLowerCase()}`}</Txt>
          </Txt>
          <ChevronRight size={18} color={colors.muted} />
        </View>
        <View style={{ gap: 2 }}>
          <Txt size={13} tone="muted">
            {t("office.siteCosts.total")}
          </Txt>
          <Txt size={32} weight="semibold" tabular tracking={-0.5}>
            {formatMoney(d.totalCents, locale)}
          </Txt>
        </View>
        <View style={styles.stats}>
          <Stat label={t("office.siteCosts.labor")} value={`${formatMinutes(d.labor.minutes)} · ${formatMoney(d.labor.cents, locale)}`} />
          <Stat label={t("office.siteCosts.expenses")} value={formatMoney(d.expenseCents, locale)} />
        </View>
        {d.labor.people.length > 0 && (
          <Txt size={13} tone="muted">
            {t("office.siteCosts.people", { count: d.labor.people.length })}
          </Txt>
        )}
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Txt size={12} tone="muted">
        {label}
      </Txt>
      <Txt size={15} weight="semibold" tabular numberOfLines={1}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radii.cardLg, padding: 16, gap: 12 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, gap: 2, backgroundColor: colors.bg, borderRadius: radii.card, paddingHorizontal: 12, paddingVertical: 10 },
});
