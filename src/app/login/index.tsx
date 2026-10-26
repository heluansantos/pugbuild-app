import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Logo } from "../../components/brand/logo";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/field";
import { Screen } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { useSession } from "../../features/session/session";
import { errorText } from "../../features/worker/payment-card";
import { api, isApiError } from "../../lib/api";
import { normalizePhone } from "../../lib/format";
import { t } from "../../lib/i18n";
import { LanguagePills } from "../../features/session/language-pills";

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const { locale, setPendingPhone } = useSession();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: async () => {
      const phone = normalizePhone(raw);
      if (!phone) throw new Error("invalid");
      await api.auth.requestCode(phone, locale);
      return phone;
    },
    onSuccess: (phone) => {
      setPendingPhone(phone);
      router.push("/login/verify");
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "invalid") setError(t("auth.login.invalidPhone"));
      else if (isApiError(e, "not_found")) setError(t("auth.login.notRegistered"));
      else if (isApiError(e, "rate_limited")) setError(t("auth.login.tooMany"));
      else toast.error(errorText(e));
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Screen style={{ justifyContent: "center" }}>
        <Animated.View entering={FadeInUp.duration(360)} style={styles.stack}>
          <Logo size={64} />
          <View style={{ gap: 6 }}>
            <Txt size={30} weight="semibold" tracking={-0.6}>
              {t("auth.login.title")}
            </Txt>
            <Txt size={15} tone="muted">
              {t("auth.login.subtitle")}
            </Txt>
          </View>
          <View style={{ gap: 8 }}>
            <Txt size={13} tone="muted">
              {t("auth.login.phone")}
            </Txt>
            <Input
              value={raw}
              onChangeText={(v) => {
                setRaw(v);
                setError(null);
              }}
              placeholder={t("auth.login.phonePlaceholder")}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={() => send.mutate()}
              accessibilityLabel={t("auth.login.phone")}
            />
            {error && (
              <Txt size={13} tone="danger">
                {error}
              </Txt>
            )}
          </View>
          <Button size="hero" loading={send.isPending} onPress={() => send.mutate()}>
            {t("auth.login.sendCode")}
          </Button>
          <Txt size={12} tone="muted2" center>
            {t("auth.legal")}
          </Txt>
          <LanguagePills />
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ stack: { gap: 22 } });
