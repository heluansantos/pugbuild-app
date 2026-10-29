import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, ImagePlus, MapPin, Navigation, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { useLocale, useMe } from "../../features/session/session";
import { FeedItem } from "../../features/site/feed-item";
import { openSiteInMaps } from "../../features/worker/open-in-maps";
import { errorText } from "../../features/worker/payment-card";
import { api, keys } from "../../lib/api";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

const MAX_PHOTOS = 4;

/** Job site: who it is, what is open, and an X-style timeline the whole crew feeds. */
export default function SiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const timezone = me.company.settings.timezone;
  const site = useQuery({ queryKey: keys.site(id), queryFn: () => api.site.get(id), enabled: !!id });
  const feed = useInfiniteQuery({
    queryKey: keys.siteFeed(id),
    queryFn: ({ pageParam }) => api.site.feed(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    enabled: !!id,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast.error(t("worker.profile.photoDenied"));
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length, quality: 0.6 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets].slice(0, MAX_PHOTOS));
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["site", id] });
  const post = useMutation({
    mutationFn: () => api.site.post(id, text, photos.map((p) => ({ uri: p.uri, mimeType: p.mimeType }))),
    onSuccess: async () => {
      setText("");
      setPhotos([]);
      toast.ok(t("worker.siteFeed.posted"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: (postId: string) => api.site.deletePost(id, postId),
    onSuccess: async () => {
      toast.ok(t("worker.siteFeed.deleted"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const confirmDelete = (postId: string) =>
    Alert.alert(t("worker.siteFeed.confirmDelete"), undefined, [
      { text: t("common.actions.cancel"), style: "cancel" },
      { text: t("worker.siteFeed.delete"), style: "destructive", onPress: () => remove.mutate(postId) },
    ]);

  const s = site.data;
  const canPost = (text.trim().length > 0 || photos.length > 0) && !post.isPending;

  const header = (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <View style={[styles.cover, { paddingTop: insets.top + 8 }]}>
        {s?.latestPhotoUrl && <Image source={{ uri: s.latestPhotoUrl }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />}
        {s?.latestPhotoUrl && <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,20,20,0.25)" }]} />}
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("common.actions.back")}>
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.pad}>
        {s ? (
          <View style={{ gap: 6 }}>
            <View style={styles.titleRow}>
              <Txt size={26} weight="semibold" tracking={-0.4} style={{ flex: 1 }}>
                {s.name}
              </Txt>
              <Pressable onPress={() => void openSiteInMaps(s)} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={t("worker.tasks.directions")}>
                <Navigation size={18} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.meta}>
              <MapPin size={14} color={colors.muted} />
              <Txt size={14} tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                {s.address}
              </Txt>
            </View>
            {s.description && (
              <Txt size={14} tone="muted">
                {s.description}
              </Txt>
            )}
            <Txt size={13} tone="muted2">
              {t("worker.siteFeed.openTasks", { count: s.openTasks })} · {t("worker.siteFeed.doneTasks", { count: s.doneTasks })} · {t("worker.siteFeed.posts", { count: s.posts })}
            </Txt>
          </View>
        ) : (
          <ActivityIndicator color={colors.ink} />
        )}
      </View>

      {s?.status === "active" && (
        <View style={[styles.pad, styles.composer]}>
          <Avatar name={me.person.name} photoUrl={me.person.photoUrl} size={40} />
          <View style={{ flex: 1, gap: 10 }}>
            <TextInput value={text} onChangeText={setText} placeholder={t("worker.siteFeed.composerPlaceholder")} placeholderTextColor={colors.muted2} multiline maxLength={1000} style={styles.input} />
            {photos.length > 0 && (
              <View style={styles.thumbs}>
                {photos.map((p, i) => (
                  <View key={p.uri}>
                    <Image source={{ uri: p.uri }} style={styles.thumb} />
                    <Pressable onPress={() => setPhotos((l) => l.filter((_, j) => j !== i))} style={styles.thumbX} hitSlop={6} accessibilityLabel={t("worker.siteFeed.delete")}>
                      <X size={12} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.composerBar}>
              <Pressable onPress={pick} disabled={photos.length >= MAX_PHOTOS} style={[styles.iconBtn, photos.length >= MAX_PHOTOS && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={t("worker.siteFeed.addPhotos")}>
                <ImagePlus size={20} color={colors.ink} />
              </Pressable>
              <Txt size={12} tone="muted2" style={{ flex: 1 }}>
                {photos.length}/{MAX_PHOTOS}
              </Txt>
              <Button size="md" disabled={!canPost} loading={post.isPending} onPress={() => post.mutate()}>
                {t("worker.siteFeed.post")}
              </Button>
            </View>
          </View>
        </View>
      )}
      <Txt size={13} weight="medium" tone="muted" style={styles.pad}>
        {t("worker.siteFeed.timeline").toUpperCase()}
      </Txt>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={styles.pad}>
            <FeedItem item={item} timezone={timezone} locale={locale} onOpenPhoto={(url) => void WebBrowser.openBrowserAsync(url)} onOpenTask={(taskId) => router.push({ pathname: "/task/[id]", params: { id: taskId } })} onDelete={confirmDelete} />
          </View>
        )}
        ListEmptyComponent={
          feed.isPending ? (
            <ActivityIndicator color={colors.ink} style={{ marginTop: 24 }} />
          ) : (
            <Txt size={14} tone="muted" center style={[styles.pad, { paddingVertical: 24 }]}>
              {t("worker.siteFeed.empty")}
            </Txt>
          )
        }
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.ink} style={{ marginVertical: 16 }} /> : undefined}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  cover: { height: 170, backgroundColor: colors.accent, paddingHorizontal: 20, overflow: "hidden" },
  back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  navBtn: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  composer: { flexDirection: "row", gap: 12, paddingVertical: 14, marginHorizontal: 20, paddingHorizontal: 14, borderRadius: radii.cardMd, backgroundColor: colors.surface },
  input: { minHeight: 44, fontFamily: "Outfit_400Regular", fontSize: 16, color: colors.ink, paddingTop: 10 },
  thumbs: { flexDirection: "row", gap: 6 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.bg },
  thumbX: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(20,20,20,0.7)", alignItems: "center", justifyContent: "center" },
  composerBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
