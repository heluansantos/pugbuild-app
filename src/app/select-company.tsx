import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Card } from "../components/ui/card";
import { Screen, Title } from "../components/ui/screen";
import { Txt } from "../components/ui/text";
import { useToast } from "../components/ui/toast";
import { useSession } from "../features/session/session";
import { errorText } from "../features/worker/payment-card";
import { api, keys } from "../lib/api";
import { t } from "../lib/i18n";
import { colors, radii } from "../theme/tokens";

export default function SelectCompanyScreen() {
  const toast = useToast();
  const { refresh } = useSession();
  const memberships = useQuery({ queryKey: keys.memberships, queryFn: () => api.auth.memberships() });
  const select = useMutation({
    mutationFn: (membershipId: string) => api.auth.selectCompany(membershipId),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(errorText(e)),
  });
  const list = memberships.data?.memberships ?? [];

  return (
    <Screen>
      <Animated.View entering={FadeInUp.duration(360)} style={{ gap: 16, paddingTop: 24 }}>
        <View style={{ gap: 6 }}>
          <Title>{t("auth.selectCompany.title")}</Title>
          <Txt size={15} tone="muted">
            {t("auth.selectCompany.subtitle")}
          </Txt>
        </View>
        {memberships.isPending && <ActivityIndicator color={colors.ink} />}
        {memberships.isSuccess && list.length === 0 && (
          <Txt size={14} tone="muted">
            {t("auth.noCompany")}
          </Txt>
        )}
        {list.map((m) => (
          <Pressable key={m.membershipId} onPress={() => select.mutate(m.membershipId)} disabled={select.isPending} accessibilityRole="button">
            <Card style={styles.row}>
              <View style={styles.icon}>
                <Building2 size={20} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={16} weight="medium">
                  {m.companyName}
                </Txt>
                <Txt size={13} tone="muted">
                  {t(`common.roles.${m.role}`)}
                </Txt>
              </View>
              <ChevronRight size={20} color={colors.muted} />
            </Card>
          </Pressable>
        ))}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
