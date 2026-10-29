import { CheckCircle2, ClipboardList, Trash2 } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Txt } from "../../components/ui/text";
import type { FeedItemDto, TaskPhotoDto } from "../../lib/api-types";
import { formatShortDate } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

/** "agora", "12 min", "3 h", then the short date. */
export function relativeTime(iso: string, timezone: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return t("worker.siteFeed.now");
  if (diff < 3_600_000) return t("worker.siteFeed.minutes", { count: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t("worker.siteFeed.hours", { count: Math.floor(diff / 3_600_000) });
  return formatShortDate(new Date(iso), timezone, locale);
}

/** X-style photo grid: one wide photo, or a 2-column grid for 2–4. */
function Photos({ photos, onOpen }: { photos: TaskPhotoDto[]; onOpen: (url: string) => void }) {
  if (photos.length === 0) return null;
  if (photos.length === 1)
    return (
      <Pressable onPress={() => onOpen(photos[0]!.url)}>
        <Image source={{ uri: photos[0]!.url }} style={styles.single} accessibilityIgnoresInvertColors />
      </Pressable>
    );
  return (
    <View style={styles.grid}>
      {photos.map((p) => (
        <Pressable key={p.pathname} onPress={() => onOpen(p.url)} style={styles.cell}>
          <Image source={{ uri: p.url }} style={styles.cellImg} accessibilityIgnoresInvertColors />
        </Pressable>
      ))}
    </View>
  );
}

export function FeedItem({ item, timezone, locale, onOpenPhoto, onOpenTask, onDelete }: { item: FeedItemDto; timezone: string; locale: string; onOpenPhoto: (url: string) => void; onOpenTask: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <View style={styles.row}>
      <Avatar name={item.author.name} photoUrl={item.author.photoUrl} size={40} />
      <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
        <View style={styles.head}>
          <Txt size={15} weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.author.name}
          </Txt>
          {item.kind !== "post" && (
            <Txt size={14} tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {item.kind === "task_done" ? t("worker.siteFeed.taskDone") : t("worker.siteFeed.taskCreated")}
            </Txt>
          )}
          <Txt size={13} tone="muted2">
            · {relativeTime(item.at, timezone, locale)}
          </Txt>
        </View>
        {item.kind === "post" && item.text && <Txt size={15}>{item.text}</Txt>}
        {item.kind !== "post" && (
          <Pressable onPress={() => onOpenTask(item.taskId)} style={[styles.task, item.kind === "task_done" && { backgroundColor: colors.okBg }]} accessibilityRole="button">
            {item.kind === "task_done" ? <CheckCircle2 size={16} color={colors.ok} /> : <ClipboardList size={16} color={colors.ink} />}
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={14} weight="medium">
                {item.title}
              </Txt>
              {item.kind === "task_created" && item.assigneeName && (
                <Txt size={13} tone="muted">
                  {t("worker.siteFeed.assigned", { name: item.assigneeName })}
                </Txt>
              )}
              {item.kind === "task_done" && item.note && <Txt size={13}>{item.note}</Txt>}
            </View>
          </Pressable>
        )}
        {"photos" in item && <Photos photos={item.photos} onOpen={onOpenPhoto} />}
        {item.kind === "post" && item.canDelete && (
          <Pressable onPress={() => onDelete(item.id)} style={styles.del} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("worker.siteFeed.delete")}>
            <Trash2 size={14} color={colors.muted2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  task: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: radii.icon, backgroundColor: colors.bg },
  single: { width: "100%", aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.bg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4, borderRadius: 16, overflow: "hidden" },
  cell: { width: "49%", aspectRatio: 1 },
  cellImg: { width: "100%", height: "100%", backgroundColor: colors.bg },
  del: { alignSelf: "flex-start", paddingVertical: 2 },
});
