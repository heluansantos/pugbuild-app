import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Building2, ChevronRight, LogOut } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Screen, Title } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { LanguagePills } from "../../features/session/language-pills";
import { useMe, useSession } from "../../features/session/session";
import { api, getApiUrl, keys } from "../../lib/api";
import { formatMoney, formatPhone } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

export default function ProfileScreen() {
  const me = useMe();
  const { signOut } = useSession();
  const router = useRouter();
  const memberships = useQuery({ queryKey: keys.memberships, queryFn: api.auth.memberships });
  const locale = me.person.locale;
  const rows: [string, string][] = [
    [t("worker.profile.company"), me.company.name],
    [t("worker.profile.role"), t(`common.roles.${me.member.role}`)],
  ];
  if (me.member.role === "worker") rows.push([t("worker.profile.hourlyRate"), `${formatMoney(me.member.hourlyRateCents, locale)}/h`]);

  return (
    <Screen tabs>
      <Title>{t("worker.profile.title")}</Title>
      <Card size="lg" style={styles.person}>
        <Avatar name={me.person.name} size={56} />
        <View style={{ flex: 1 }}>
          <Txt size={18} weight="semibold" numberOfLines={1}>
            {me.person.name}
          </Txt>
          <Txt size={14} tone="muted">
            {formatPhone(me.person.phone)}
          </Txt>
        </View>
      </Card>
      <Card size="lg" style={{ paddingVertical: 4 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Txt size={15} tone="muted">
              {k}
            </Txt>
            <Txt size={15} weight="medium">
              {v}
            </Txt>
          </View>
        ))}
        <View style={[styles.row, { borderBottomWidth: 0, gap: 12 }]}>
          <Txt size={15} tone="muted">
            {t("common.language")}
          </Txt>
          <LanguagePills compact />
        </View>
      </Card>
      {(memberships.data?.memberships.length ?? 0) > 1 && (
        <Pressable onPress={() => router.push("/select-company")} accessibilityRole="button">
          <Card style={styles.link}>
            <Building2 size={20} color={colors.muted} />
            <Txt size={15} weight="medium" style={{ flex: 1 }}>
              {t("worker.profile.switchCompany")}
            </Txt>
            <ChevronRight size={20} color={colors.muted} />
          </Card>
        </Pressable>
      )}
      <Button variant="secondary" leading={<LogOut size={20} color={colors.ink} />} onPress={() => signOut()} style={{ marginTop: 8 }}>
        {t("common.actions.signOut")}
      </Button>
      <Txt size={11} tone="muted2" center>
        {getApiUrl().replace(/^https?:\/\//, "")}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: "row", alignItems: "center", gap: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  link: { flexDirection: "row", alignItems: "center", gap: 12 },
});
