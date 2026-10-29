import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { api } from "../../lib/api";
import { t } from "../../lib/i18n";
import { shrinkPhoto } from "../../lib/photos";
import { colors, radii } from "../../theme/tokens";
import { errorText } from "../worker/payment-card";

const MAX_PHOTOS = 4;

/**
 * The "what's new" box. Its typing state lives here, so a keystroke re-renders this box only,
 * not every post in the timeline.
 */
export function SiteComposer({ siteId, name, photoUrl, onPosted }: { siteId: string; name: string; photoUrl?: string; onPosted: () => Promise<unknown> }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast.error(t("worker.profile.photoDenied"));
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length, quality: 0.8 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets].slice(0, MAX_PHOTOS));
  };

  const post = useMutation({
    mutationFn: async () => api.site.post(siteId, text, await Promise.all(photos.map(shrinkPhoto))),
    onSuccess: async () => {
      setText("");
      setPhotos([]);
      toast.ok(t("worker.siteFeed.posted"));
      await onPosted();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const canPost = (text.trim().length > 0 || photos.length > 0) && !post.isPending;

  return (
    <View style={styles.composer}>
      <Avatar name={name} photoUrl={photoUrl} size={40} />
      <View style={{ flex: 1, gap: 10 }}>
        <TextInput value={text} onChangeText={setText} placeholder={t("worker.siteFeed.composerPlaceholder")} placeholderTextColor={colors.muted2} multiline maxLength={1000} style={styles.input} accessibilityLabel={t("worker.siteFeed.composerPlaceholder")} />
        {photos.length > 0 && (
          <View style={styles.thumbs}>
            {photos.map((p, i) => (
              <View key={p.uri}>
                <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
                <Pressable onPress={() => setPhotos((l) => l.filter((_, j) => j !== i))} style={styles.thumbX} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("worker.siteFeed.delete")}>
                  <X size={12} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={styles.bar}>
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
  );
}

const styles = StyleSheet.create({
  composer: { flexDirection: "row", gap: 12, paddingVertical: 14, marginHorizontal: 20, paddingHorizontal: 14, borderRadius: radii.cardMd, backgroundColor: colors.surface },
  input: { minHeight: 44, fontFamily: "Outfit_400Regular", fontSize: 16, color: colors.ink, paddingTop: 10 },
  thumbs: { flexDirection: "row", gap: 6 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.bg },
  thumbX: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(20,20,20,0.7)", alignItems: "center", justifyContent: "center" },
  bar: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
