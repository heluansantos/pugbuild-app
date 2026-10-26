import { useMutation, useQuery } from "@tanstack/react-query";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Check, FileText, MapPin, MessageSquareText } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Screen } from "../components/ui/screen";
import { Txt } from "../components/ui/text";
import { useToast } from "../components/ui/toast";
import { useSession } from "../features/session/session";
import { errorText } from "../features/worker/payment-card";
import { api, getApiUrl, keys } from "../lib/api";
import { t } from "../lib/i18n";
import { colors, radii } from "../theme/tokens";

type Key = "terms" | "location" | "sms";
const ITEMS: { key: Key; Icon: typeof FileText }[] = [
  { key: "terms", Icon: FileText },
  { key: "location", Icon: MapPin },
  { key: "sms", Icon: MessageSquareText },
];

/** First sign-in: Terms + Privacy, location at clock-in and SMS, all required (same as the web /welcome). */
export default function WelcomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { locale, refresh, signOut } = useSession();
  const [checked, setChecked] = useState<Record<Key, boolean>>({ terms: false, location: false, sms: false });
  const all = ITEMS.every((i) => checked[i.key]);

  // The membership list works before consent and tells us the person's name and whether to pick a company.
  const memberships = useQuery({ queryKey: keys.memberships, queryFn: () => api.auth.memberships() });
  const list = memberships.data?.memberships ?? [];
  useEffect(() => {
    if (list.length > 1) router.replace("/select-company");
  }, [list.length, router]);

  const accept = useMutation({
    mutationFn: () => api.auth.consent(locale),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(errorText(e)),
  });

  const body = (key: Key) => t(`auth.welcome.${key}.body`).replace(/<\/?(terms|privacy)>/g, "");

  return (
    <Screen>
      <Animated.View entering={FadeInUp.duration(360)} style={{ gap: 18, paddingTop: 24 }}>
        <View style={{ gap: 6 }}>
          <Txt size={30} weight="semibold" tracking={-0.6}>
            {t("auth.welcome.title", { name: "" }).replace(/,\s*$/, "")}
          </Txt>
          <Txt size={15} tone="muted">
            {t("auth.welcome.subtitle")}
          </Txt>
        </View>
        {ITEMS.map(({ key, Icon }) => (
          <Pressable key={key} onPress={() => setChecked((c) => ({ ...c, [key]: !c[key] }))} accessibilityRole="checkbox" accessibilityState={{ checked: checked[key] }}>
            <Card size="lg" style={styles.item}>
              <View style={styles.icon}>
                <Icon size={20} color={colors.ink} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt size={16} weight="semibold">
                  {t(`auth.welcome.${key}.title`)}
                </Txt>
                <Txt size={14} tone="muted">
                  {body(key)}
                </Txt>
                {key === "terms" && (
                  <View style={styles.links}>
                    <Pressable onPress={() => Linking.openURL(`${getApiUrl()}/terms`)} hitSlop={6}>
                      <Txt size={13} weight="medium" style={{ textDecorationLine: "underline" }}>
                        Terms
                      </Txt>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL(`${getApiUrl()}/privacy`)} hitSlop={6}>
                      <Txt size={13} weight="medium" style={{ textDecorationLine: "underline" }}>
                        Privacy
                      </Txt>
                    </Pressable>
                  </View>
                )}
              </View>
              <View style={[styles.check, checked[key] && styles.checked]}>{checked[key] && <Check size={16} color={colors.ink} strokeWidth={3} />}</View>
            </Card>
          </Pressable>
        ))}
        <Button size="hero" disabled={!all} loading={accept.isPending} onPress={() => accept.mutate()}>
          {t("auth.welcome.continue")}
        </Button>
        <Pressable onPress={() => signOut()} style={{ alignSelf: "center", padding: 8 }}>
          <Txt size={14} tone="muted" weight="medium">
            {t("auth.welcome.decline")}
          </Txt>
        </Pressable>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 40, height: 40, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  links: { flexDirection: "row", gap: 14, marginTop: 4 },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent },
});
