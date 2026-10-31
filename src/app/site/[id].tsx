import { Image } from "expo-image";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, MapPin, Navigation } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadError } from "../../components/ui/load-error";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { useLocale, useSession } from "../../features/session/session";
import { FeedItem } from "../../features/site/feed-item";
import { SiteCostsCard } from "../../features/site/site-costs-card";
import { SiteComposer } from "../../features/site/site-composer";
import type { FeedItemDto } from "../../lib/api-types";
import { openSiteInMaps } from "../../features/worker/open-in-maps";
import { errorText } from "../../features/worker/payment-card";
import { api, keys } from "../../lib/api";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";


/** Job site: who it is, what is open, and an X-style timeline the whole crew feeds. */
export default function SiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me } = useSession();
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const timezone = me?.company.settings.timezone ?? "UTC";
  const site = useQuery({ queryKey: keys.site(id), queryFn: () => api.site.get(id), enabled: !!id });
  const feed = useInfiniteQuery({
    queryKey: keys.siteFeed(id),
    queryFn: ({ pageParam }) => api.site.feed(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    enabled: !!id,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["site", id] });
  const remove = useMutation({
    mutationFn: (postId: string) => api.site.deletePost(id, postId),
    onSuccess: async () => {
      toast.ok(t("worker.siteFeed.deleted"));
      await refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const confirmDelete = useCallback((postId: string) =>
    Alert.alert(t("worker.siteFeed.confirmDelete"), undefined, [
      { text: t("common.actions.cancel"), style: "cancel" },
      { text: t("worker.siteFeed.delete"), style: "destructive", onPress: () => remove.mutate(postId) },
    ]), [remove]);

  const s = site.data;

  const header = (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <View style={[styles.cover, { paddingTop: insets.top + 8 }]}>
        {s?.latestPhotoUrl && <Image source={{ uri: s.latestPhotoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={120} />}
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
        ) : site.isError ? (
          <LoadError onRetry={() => void site.refetch()} />
        ) : (
          <ActivityIndicator color={colors.ink} />
        )}
      </View>

      {s && me && me.member.role !== "worker" && <SiteCostsCard siteId={id} locale={locale} />}
      {s?.status === "active" && <SiteComposer siteId={id} name={me?.person.name ?? ""} photoUrl={me?.person.photoUrl} onPosted={refresh} />}
      <Txt size={13} weight="medium" tone="muted" style={styles.pad}>
        {t("worker.siteFeed.timeline").toUpperCase()}
      </Txt>
    </View>
  );

  // Stable callbacks so memoized posts do not re-render on unrelated state changes.
  const openPhoto = useCallback((url: string) => void WebBrowser.openBrowserAsync(url), []);
  const openTask = useCallback((taskId: string) => router.push({ pathname: "/task/[id]", params: { id: taskId } }), [router]);
  const renderItem = useCallback(
    ({ item }: { item: FeedItemDto }) => (
      <View style={styles.pad}>
        <FeedItem item={item} timezone={timezone} locale={locale} onOpenPhoto={openPhoto} onOpenTask={openTask} onDelete={confirmDelete} />
      </View>
    ),
    [timezone, locale, openPhoto, openTask, confirmDelete],
  );

  // Signed out while this screen was open: render nothing until the gate redirects.
  if (!me) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        renderItem={renderItem}
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
});
