import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { EmptyState } from "../../components/ui/empty-state";
import { Screen, Title } from "../../components/ui/screen";
import { Txt } from "../../components/ui/text";
import { useLocale, useMe } from "../../features/session/session";
import { TaskRow } from "../../features/tasks/task-row";
import { SitesList } from "../../features/worker/sites-list";
import { api, keys } from "../../lib/api";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

type Segment = "tasks" | "sites";

/** Tasks assigned to the person (office: every task), plus the job sites behind a segment. */
export default function TasksScreen() {
  const me = useMe();
  const locale = useLocale();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>("tasks");
  const tasks = useQuery({ queryKey: keys.tasks, queryFn: () => api.tasks.list(), staleTime: 30_000 });
  const list = tasks.data?.tasks ?? [];
  const open = list.filter((x) => x.status === "open");
  const done = list.filter((x) => x.status === "done");

  return (
    <Screen tabs>
      <Title>{t("worker.tasks.title")}</Title>
      <View style={styles.segments} accessibilityRole="tablist">
        {(["tasks", "sites"] as Segment[]).map((s) => (
          <Pressable key={s} onPress={() => setSegment(s)} accessibilityRole="tab" accessibilityState={{ selected: segment === s }} style={[styles.segment, segment === s && styles.segmentActive]}>
            <Txt size={14} weight="semibold" tone={segment === s ? "white" : "ink"}>
              {s === "tasks" ? t("worker.tasks.segTasks") : t("worker.tasks.segSites")}
            </Txt>
            {s === "tasks" && open.length > 0 && (
              <View style={[styles.badge, segment === s && { backgroundColor: colors.accent }]}>
                <Txt size={11} weight="semibold" tone="ink">
                  {String(open.length)}
                </Txt>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {segment === "sites" ? (
        <SitesList />
      ) : tasks.isPending ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <Txt size={13} weight="medium" tone="muted">
            {t("worker.tasks.open").toUpperCase()}
          </Txt>
          {open.length === 0 && <EmptyState icon={<ClipboardList size={20} color={colors.ink} />} title={t("common.states.empty")} body={t("worker.tasks.empty")} />}
          {open.map((task, i) => (
            <Animated.View key={task.id} entering={FadeInUp.delay(i * 40).duration(300)}>
              <TaskRow task={task} locale={locale} timezone={me.company.settings.timezone} onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })} />
            </Animated.View>
          ))}
          {done.length > 0 && (
            <>
              <Txt size={13} weight="medium" tone="muted" style={{ marginTop: 8 }}>
                {t("worker.tasks.done").toUpperCase()}
              </Txt>
              {done.map((task) => (
                <TaskRow key={task.id} task={task} locale={locale} timezone={me.company.settings.timezone} onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })} />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: "row", gap: 4, padding: 4, borderRadius: radii.pill, backgroundColor: colors.nav, alignSelf: "flex-start" },
  segment: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 16, borderRadius: radii.pill },
  segmentActive: { backgroundColor: colors.ink },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});
