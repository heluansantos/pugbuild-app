import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "../../components/ui/button";
import { Screen } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { useSession } from "../../features/session/session";
import { errorText } from "../../features/worker/payment-card";
import { api, getApiUrl, isApiError } from "../../lib/api";
import { formatPhone } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, fonts, radii } from "../../theme/tokens";

const LENGTH = 6;
const devCodeHint = () => /localhost|127\.0\.0\.1|192\.168\.|172\.|10\.|vercel\.app/.test(getApiUrl());

export default function VerifyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { pendingPhone, locale, afterVerify } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (!pendingPhone) router.replace("/login");
  }, [pendingPhone, router]);

  const verify = useMutation({
    mutationFn: (c: string) => api.auth.verify(pendingPhone ?? "", c),
    onSuccess: (res) => afterVerify(res),
    onError: (e) => {
      setCode("");
      if (isApiError(e, "unauthorized") || isApiError(e, "validation")) setError(t("auth.verify.wrongCode"));
      else if (isApiError(e, "not_found")) setError(t("auth.verify.expired"));
      else if (isApiError(e, "rate_limited")) setError(t("auth.login.tooMany"));
      else toast.error(errorText(e));
    },
  });

  const resend = useMutation({
    mutationFn: () => api.auth.requestCode(pendingPhone ?? "", locale),
    onSuccess: () => toast.ok(t("auth.verify.resent")),
    onError: (e) => toast.error(errorText(e)),
  });

  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === LENGTH && !verify.isPending) verify.mutate(digits);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Screen style={{ justifyContent: "center" }}>
        <Animated.View entering={FadeInUp.duration(360)} style={styles.stack}>
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
            <ArrowLeft size={22} color={colors.ink} />
          </Pressable>
          <View style={{ gap: 6 }}>
            <Txt size={30} weight="semibold" tracking={-0.6}>
              {t("auth.verify.title")}
            </Txt>
            <Txt size={15} tone="muted">
              {t("auth.verify.subtitle", { phone: pendingPhone ? formatPhone(pendingPhone) : "" })}
            </Txt>
          </View>

          <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessibilityLabel={t("auth.verify.code")}>
            {Array.from({ length: LENGTH }).map((_, i) => {
              const filled = code[i];
              const active = i === code.length;
              return (
                <View key={i} style={[styles.box, active && styles.boxActive, !!error && styles.boxError]}>
                  <Txt size={26} weight="semibold" tabular>
                    {filled ?? ""}
                  </Txt>
                </View>
              );
            })}
            <TextInput
              ref={input}
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoFocus
              maxLength={LENGTH}
              style={styles.hidden}
              caretHidden
            />
          </Pressable>
          {error && (
            <Txt size={13} tone="danger" center>
              {error}
            </Txt>
          )}
          {devCodeHint() && (
            <Txt size={12} tone="muted2" center>
              {t("auth.verify.devHint", { code: "123456" })}
            </Txt>
          )}

          <Button size="hero" loading={verify.isPending} disabled={code.length < LENGTH} onPress={() => verify.mutate(code)}>
            {t("auth.verify.verify")}
          </Button>
          <Button variant="secondary" size="md" loading={resend.isPending} onPress={() => resend.mutate()}>
            {t("auth.verify.resend")}
          </Button>
          <Pressable onPress={() => router.replace("/login")} style={{ alignSelf: "center", padding: 8 }}>
            <Txt size={14} tone="muted" weight="medium">
              {t("auth.verify.changeNumber")}
            </Txt>
          </Pressable>
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  boxes: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: { flex: 1, maxWidth: 52, height: 62, borderRadius: radii.card, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  boxActive: { borderColor: colors.ink },
  boxError: { borderColor: colors.danger },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1, fontFamily: fonts.regular },
});
