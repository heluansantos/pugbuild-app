import { Image } from "expo-image";
import { CheckCircle2, ChevronRight, ClipboardList, ImageIcon, MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { Txt } from "../../components/ui/text";
import type { TaskDto } from "../../lib/api-types";
import { formatShortDate, keyToDate, todayKeyIn } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

export function TaskRow({ task, locale, timezone, onPress }: { task: TaskDto; locale: string; timezone: string; onPress: () => void }) {
  const cover = task.completion?.photos[0] ?? task.photos[0];
  const overdue = task.status === "open" && !!task.dueKey && task.dueKey < todayKeyIn(timezone);
  const photoCount = task.photos.length + (task.completion?.photos.length ?? 0);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={[styles.row, task.status === "done" && { opacity: 0.8 }]}>
        {cover ? (
          <Image source={{ uri: cover.url }} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={120} />
        ) : (
          <View style={[styles.icon, task.status === "done" && { backgroundColor: colors.okBg }]}>
            {task.status === "done" ? <CheckCircle2 size={20} color={colors.ok} /> : <ClipboardList size={20} color={colors.ink} />}
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={15} weight="medium" numberOfLines={2}>
            {task.title}
          </Txt>
          <View style={styles.meta}>
            {task.siteName && (
              <View style={styles.metaItem}>
                <MapPin size={12} color={colors.muted} />
                <Txt size={12} tone="muted" numberOfLines={1}>
                  {task.siteName}
                </Txt>
              </View>
            )}
            {photoCount > 0 && (
              <View style={styles.metaItem}>
                <ImageIcon size={12} color={colors.muted} />
                <Txt size={12} tone="muted">
                  {String(photoCount)}
                </Txt>
              </View>
            )}
          </View>
          {task.status === "open" && task.dueKey && (
            <Chip tone={overdue ? "warn" : "neutral"} size="sm">
              {overdue ? t("worker.tasks.overdue") : t("worker.tasks.dueOn", { date: formatShortDate(keyToDate(task.dueKey), "UTC", locale) })}
            </Chip>
          )}
          {task.status === "done" && task.completion && (
            <Txt size={12} tone="ok" numberOfLines={1}>
              {t("worker.tasks.completedBy", { name: task.completion.byName ?? "—", date: formatShortDate(new Date(task.completion.at), timezone, locale) })}
            </Txt>
          )}
        </View>
        <ChevronRight size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  photo: { width: 52, height: 52, borderRadius: radii.icon, backgroundColor: colors.bg },
  icon: { width: 52, height: 52, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 200 },
});
