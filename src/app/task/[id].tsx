import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Camera, CheckCircle2, ImagePlus, MapPin, Navigation, Trash2, User } from "lucide-react-native";
import { useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { Textarea } from "../../components/ui/field";
import { Screen } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { useLocale, useMe } from "../../features/session/session";
import { openSiteInMaps } from "../../features/worker/open-in-maps";
import { errorText } from "../../features/worker/payment-card";
import { api, keys } from "../../lib/api";
import type { TaskPhotoDto } from "../../lib/api-types";
import { formatShortDate, keyToDate, todayKeyIn } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

/** One task: brief from the office, the person's own photos and note, and the "done" button. */
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const timezone = me.company.settings.timezone;
  const staff = me.member.role !== "worker";
  const task = useQuery({ queryKey: keys.task(id), queryFn: () => api.tasks.get(id), enabled: !!id });
  const sites = useQuery({ queryKey: keys.sites, queryFn: api.sites, staleTime: 5 * 60_000 });
  const [note, setNote] = useState("");

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: keys.tasks });
    await task.refetch();
  };

  const upload = useMutation({
    mutationFn: async (source: "camera" | "library") => {
      const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("denied");
      const picked =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 6 });
      if (picked.canceled) return 0;
      for (const asset of picked.assets) await api.tasks.addPhoto(id, asset.uri, asset.mimeType ?? "image/jpeg");
      return picked.assets.length;
    },
    onSuccess: async (n) => {
      if (n > 0) toast.ok(t("worker.tasks.photoAdded"));
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error && e.message === "denied" ? t("worker.profile.photoDenied") : errorText(e)),
  });
  const removePhoto = useMutation({
    mutationFn: (pathname: string) => api.tasks.removePhoto(id, pathname),
    onSuccess: refresh,
    onError: (e) => toast.error(errorText(e)),
  });
  const complete = useMutation({
    mutationFn: () => api.tasks.complete(id, note.trim() || undefined),
    onSuccess: async () => {
      toast.ok(t("worker.tasks.completed"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const reopen = useMutation({
    mutationFn: () => api.tasks.reopen(id),
    onSuccess: async () => {
      toast.ok(t("worker.tasks.reopened"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const pickSource = () => {
    const options = [t("worker.tasks.takePhoto"), t("worker.tasks.pickPhoto"), t("common.actions.cancel")];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, (i) => {
        if (i === 0) upload.mutate("camera");
        if (i === 1) upload.mutate("library");
      });
    } else {
      Alert.alert(t("worker.tasks.addPhoto"), undefined, [
        { text: options[0]!, onPress: () => upload.mutate("camera") },
        { text: options[1]!, onPress: () => upload.mutate("library") },
        { text: options[2]!, style: "cancel" },
      ]);
    }
  };

  const data = task.data;
  const site = data?.siteId ? sites.data?.sites.find((s) => s.id === data.siteId) : undefined;
  const mine = data?.completion?.photos ?? [];
  const overdue = data?.status === "open" && !!data.dueKey && data.dueKey < todayKeyIn(timezone);
  const canClose = !!data && data.status === "open" && (staff || data.assigneeMembershipId === me.member.id);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
            <ArrowLeft size={22} color={colors.ink} />
          </Pressable>
          {data && (
            <Chip tone={data.status === "done" ? "ok" : overdue ? "warn" : "accent"} size="sm">
              {data.status === "done" ? t("worker.tasks.done") : overdue ? t("worker.tasks.overdue") : t("worker.tasks.open")}
            </Chip>
          )}
        </View>

        {task.isPending || !data ? (
          <ActivityIndicator color={colors.ink} style={{ height: 160 }} />
        ) : (
          <>
            <Txt size={26} weight="semibold" tracking={-0.4}>
              {data.title}
            </Txt>
            <View style={{ gap: 6 }}>
              {data.assigneeName && (
                <View style={styles.metaRow}>
                  <User size={16} color={colors.muted} />
                  <Txt size={14} tone="muted">
                    {t("worker.tasks.assignedTo", { name: data.assigneeName })}
                  </Txt>
                </View>
              )}
              {data.dueKey && data.status === "open" && (
                <Txt size={14} tone={overdue ? "danger" : "muted"}>
                  {t("worker.tasks.dueOn", { date: formatShortDate(keyToDate(data.dueKey), "UTC", locale) })}
                </Txt>
              )}
            </View>

            {data.siteName && (
              <Card style={styles.siteRow}>
                <View style={styles.siteIcon}>
                  <MapPin size={18} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={15} weight="medium" numberOfLines={1}>
                    {data.siteName}
                  </Txt>
                  {site?.address && (
                    <Txt size={12} tone="muted" numberOfLines={1}>
                      {site.address}
                    </Txt>
                  )}
                </View>
                {site && (
                  <Pressable onPress={() => void openSiteInMaps(site)} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={t("worker.tasks.directions")}>
                    <Navigation size={18} color={colors.ink} />
                  </Pressable>
                )}
              </Card>
            )}

            {data.description && (
              <Card size="lg" style={{ gap: 6 }}>
                <Txt size={13} weight="medium" tone="muted">
                  {t("worker.tasks.details")}
                </Txt>
                <Txt size={15}>{data.description}</Txt>
              </Card>
            )}

            {data.photos.length > 0 && <PhotoStrip title={t("worker.tasks.reference")} photos={data.photos} />}

            {data.status === "done" && data.completion ? (
              <Card size="lg" style={{ gap: 10, backgroundColor: colors.okBg }}>
                <View style={styles.metaRow}>
                  <CheckCircle2 size={18} color={colors.ok} />
                  <Txt size={14} weight="medium" tone="ok">
                    {t("worker.tasks.completedBy", { name: data.completion.byName ?? "—", date: formatShortDate(new Date(data.completion.at), timezone, locale) })}
                  </Txt>
                </View>
                {data.completion.note && <Txt size={15}>{data.completion.note}</Txt>}
                {mine.length > 0 && <PhotoStrip photos={mine} />}
                {staff && (
                  <Button variant="secondary" size="md" loading={reopen.isPending} onPress={() => reopen.mutate()}>
                    {t("worker.tasks.reopen")}
                  </Button>
                )}
              </Card>
            ) : (
              canClose && (
                <Card size="lg" style={{ gap: 12 }}>
                  <Txt size={13} weight="medium" tone="muted">
                    {t("worker.tasks.yourPhotos")}
                  </Txt>
                  {mine.length === 0 ? (
                    <Txt size={13} tone="muted">
                      {t("worker.tasks.noPhotosYet")}
                    </Txt>
                  ) : (
                    <PhotoStrip photos={mine} onRemove={(p) => removePhoto.mutate(p.pathname)} />
                  )}
                  <Button variant="secondary" size="md" loading={upload.isPending} leading={<Camera size={18} color={colors.ink} />} onPress={pickSource}>
                    {t("worker.tasks.addPhoto")}
                  </Button>
                  <View style={{ gap: 6 }}>
                    <Txt size={13} tone="muted">
                      {t("worker.tasks.note")}
                    </Txt>
                    <Textarea value={note} onChangeText={setNote} placeholder={t("worker.tasks.notePlaceholder")} maxLength={2000} />
                  </View>
                  <Button size="hero" loading={complete.isPending} leading={<CheckCircle2 size={20} color={colors.white} />} onPress={() => complete.mutate()}>
                    {complete.isPending ? t("worker.tasks.completing") : t("worker.tasks.markDone")}
                  </Button>
                </Card>
              )
            )}
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function PhotoStrip({ title, photos, onRemove }: { title?: string; photos: TaskPhotoDto[]; onRemove?: (p: TaskPhotoDto) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {title && (
        <Txt size={13} weight="medium" tone="muted">
          {title}
        </Txt>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {photos.map((p) => (
          <View key={p.pathname} style={styles.thumbWrap}>
            <Image source={{ uri: p.url }} style={styles.thumb} accessibilityIgnoresInvertColors />
            {onRemove && (
              <Pressable onPress={() => onRemove(p)} style={styles.remove} accessibilityRole="button" accessibilityLabel={t("worker.tasks.removePhoto")} hitSlop={6}>
                <Trash2 size={14} color={colors.white} />
              </Pressable>
            )}
          </View>
        ))}
        {onRemove && (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <ImagePlus size={20} color={colors.muted} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  siteIcon: { width: 40, height: 40, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  navBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  thumbWrap: { position: "relative" },
  thumb: { width: 112, height: 112, borderRadius: radii.icon, backgroundColor: colors.bg },
  thumbEmpty: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.muted3 },
  remove: { position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: radii.pill, backgroundColor: "rgba(20,20,20,0.7)", alignItems: "center", justifyContent: "center" },
});
