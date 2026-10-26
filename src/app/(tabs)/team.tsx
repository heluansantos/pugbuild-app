import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, RefreshControl, StyleSheet, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { Screen, Title } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useMe } from "../../features/session/session";
import { api, keys } from "../../lib/api";
import { formatMoney, formatPhone } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

/** Office and admin: the active team with role, phone and rate. */
export default function TeamScreen() {
  const me = useMe();
  const locale = me.person.locale;
  const team = useQuery({ queryKey: keys.officeTeam, queryFn: api.office.team });
  const members = [...(team.data?.members ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen tabs refreshControl={<RefreshControl refreshing={team.isFetching && !team.isPending} onRefresh={() => void team.refetch()} tintColor={colors.ink} />}>
      <View style={{ gap: 4 }}>
        <Title>{t("office.team.title")}</Title>
        {team.data && (
          <Txt size={14} tone="muted">
            {t("office.team.count", { count: members.length })}
          </Txt>
        )}
      </View>
      {team.isPending ? (
        <ActivityIndicator color={colors.ink} style={{ height: 160 }} />
      ) : (
        <Card>
          {members.map((m) => (
            <View key={m.id} style={styles.row}>
              <Avatar name={m.name} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={15} weight="medium" numberOfLines={1}>
                  {m.name}
                </Txt>
                <Txt size={12} tone="muted" numberOfLines={1}>
                  {[formatPhone(m.phone), m.jobTitle, m.status === "invited" ? t("office.team.invited") : null].filter(Boolean).join(" · ")}
                </Txt>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Chip tone={m.role === "worker" ? "neutral" : "dark"} size="sm">
                  {t(`common.roles.${m.role}`)}
                </Chip>
                {m.hourlyRateCents > 0 && (
                  <Txt size={12} tone="muted" tabular>
                    {formatMoney(m.hourlyRateCents, locale)}
                    {t("office.team.perHour")}
                  </Txt>
                )}
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2 },
});
