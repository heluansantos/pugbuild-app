import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Building2, Camera, ChevronRight, FileText, LifeBuoy, LogOut, Mail, ShieldCheck } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Screen, Title } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { LanguagePills } from "../../features/session/language-pills";
import { useMe, useSession } from "../../features/session/session";
import { errorText } from "../../features/worker/payment-card";
import { api, getApiUrl, keys } from "../../lib/api";
import { formatMoney, formatPhone } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

const SUPPORT_EMAIL = "hello@pugbuild.com";

export default function ProfileScreen() {
  const me = useMe();
  const { signOut, refresh } = useSession();
  const router = useRouter();
  const toast = useToast();
  const memberships = useQuery({ queryKey: keys.memberships, queryFn: api.auth.memberships });
  const locale = me.person.locale;
  const version = Constants.expoConfig?.version ?? "0.0.0";
  const rows: [string, string][] = [
    [t("worker.profile.company"), me.company.name],
    [t("worker.profile.role"), t(`common.roles.${me.member.role}`)],
  ];
  if (me.member.role === "worker") rows.push([t("worker.profile.hourlyRate"), `${formatMoney(me.member.hourlyRateCents, locale)}/h`]);

  const photo = useMutation({
    mutationFn: async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("denied");
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (picked.canceled) return null;
      const asset = picked.assets[0]!;
      await api.setPhoto(asset.uri, asset.mimeType ?? "image/jpeg");
      await refresh();
      return true;
    },
    onSuccess: (done) => {
      if (done) toast.ok(t("worker.profile.photoUpdated"));
    },
    onError: (e) => {
      console.warn("profile photo upload failed", e);
      toast.error(e instanceof Error && e.message === "denied" ? t("worker.profile.photoDenied") : errorText(e));
    },
  });

  const openLegal = (path: "terms" | "privacy") => WebBrowser.openBrowserAsync(`${getApiUrl()}/${path}?lang=${locale}`, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  const emailSupport = () => {
    const subject = encodeURIComponent(`PugBuild ${version} · ${me.company.name}`);
    const body = encodeURIComponent(`\n\n—\n${me.person.name} · ${formatPhone(me.person.phone)} · ${t(`common.roles.${me.member.role}`)}`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  return (
    <Screen tabs>
      <Title>{t("worker.profile.title")}</Title>
      <Card size="lg" style={styles.person}>
        <Pressable onPress={() => photo.mutate()} disabled={photo.isPending} accessibilityRole="button" accessibilityLabel={t("worker.profile.changePhoto")} style={styles.avatarWrap}>
          <Avatar name={me.person.name} photoUrl={me.person.photoUrl} size={64} />
          <View style={styles.badge}>{photo.isPending ? <ActivityIndicator size="small" color={colors.ink} /> : <Camera size={14} color={colors.ink} />}</View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={18} weight="semibold" numberOfLines={1}>
            {me.person.name}
          </Txt>
          <Txt size={14} tone="muted">
            {formatPhone(me.person.phone)}
          </Txt>
          <Pressable onPress={() => photo.mutate()} disabled={photo.isPending} hitSlop={6} style={{ marginTop: 4 }}>
            <Txt size={13} weight="medium">
              {t("worker.profile.changePhoto")}
            </Txt>
          </Pressable>
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
        <LinkRow icon={<Building2 size={20} color={colors.muted} />} label={t("worker.profile.switchCompany")} onPress={() => router.push("/select-company")} />
      )}

      <Section title={t("worker.profile.support")}>
        <Txt size={14} tone="muted">
          {t("worker.profile.supportBody")}
        </Txt>
        <Button variant="secondary" size="md" leading={<Mail size={18} color={colors.ink} />} onPress={emailSupport}>
          {t("worker.profile.supportEmail")}
        </Button>
        <Txt size={12} tone="muted2" center>
          {SUPPORT_EMAIL}
        </Txt>
      </Section>

      <Section title={t("worker.profile.legal")}>
        <LinkRow inset icon={<FileText size={20} color={colors.muted} />} label={t("worker.profile.terms")} onPress={() => void openLegal("terms")} />
        <LinkRow inset icon={<ShieldCheck size={20} color={colors.muted} />} label={t("worker.profile.privacy")} onPress={() => void openLegal("privacy")} />
      </Section>

      <Button variant="secondary" leading={<LogOut size={20} color={colors.ink} />} onPress={() => signOut()} style={{ marginTop: 8 }}>
        {t("common.actions.signOut")}
      </Button>
      <Txt size={11} tone="muted2" center>
        {t("worker.profile.version", { version })} · {getApiUrl().replace(/^https?:\/\//, "")}
      </Txt>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.sectionTitle}>
        {title === t("worker.profile.support") && <LifeBuoy size={16} color={colors.muted} />}
        <Txt size={13} weight="medium" tone="muted">
          {title.toUpperCase()}
        </Txt>
      </View>
      <Card size="lg" style={{ gap: 12 }}>
        {children}
      </Card>
    </View>
  );
}

function LinkRow({ icon, label, onPress, inset }: { icon: ReactNode; label: string; onPress: () => void; inset?: boolean }) {
  const inner = (
    <>
      {icon}
      <Txt size={15} weight="medium" style={{ flex: 1 }}>
        {label}
      </Txt>
      <ChevronRight size={20} color={colors.muted} />
    </>
  );
  if (inset)
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.insetRow}>
        {inner}
      </Pressable>
    );
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.link}>{inner}</Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { width: 64, height: 64 },
  badge: { position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: radii.pill, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  link: { flexDirection: "row", alignItems: "center", gap: 12 },
  insetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
});
