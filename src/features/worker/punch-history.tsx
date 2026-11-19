import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { LoadError } from "../../components/ui/load-error";
import { Sheet } from "../../components/ui/sheet";
import { Txt } from "../../components/ui/text";
import { api, keys } from "../../lib/api";
import type { PunchDto, PunchHistoryEntry } from "../../lib/api-types";
import { formatMinutes, formatShortDate, formatTime } from "../../lib/format";
import { t } from "../../lib/i18n";
import { historyLines, isPunchEdited, type HistoryLine } from "../../lib/punch-history";
import { useTheme } from "../../theme/theme";
import { touch } from "../../theme/tokens";

interface Zone {
  timezone: string;
  locale: string;
}

/** The shifts of a week. An edited one carries the marker; any of them opens its history. */
export function ShiftList({ punches, timezone, locale }: { punches: PunchDto[] } & Zone) {
  const { colors } = useTheme();
  const [openId, setOpenId] = useState<string | null>(null);
  if (punches.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Txt size={15} weight="semibold">
        {t("worker.week.shifts")}
      </Txt>
      {punches.map((p) => {
        const start = new Date(p.clockIn.at);
        const day = formatShortDate(start, timezone, locale);
        return (
          <Pressable
            key={p.id}
            onPress={() => setOpenId(p.id)}
            accessibilityRole="button"
            accessibilityLabel={t("common.punchHistory.open", { day })}
          >
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={15} weight="medium">
                  {day}
                </Txt>
                <Txt size={13} tone="muted" tabular>
                  {formatTime(start, timezone, locale)}
                  {" – "}
                  {p.clockOut ? formatTime(new Date(p.clockOut.at), timezone, locale) : "…"}
                  {p.status === "closed" ? ` · ${formatMinutes(p.workedMinutes ?? 0)}` : ""}
                </Txt>
              </View>
              {isPunchEdited(p) ? (
                <Chip tone="warn" size="sm">
                  {t("common.punchHistory.edited")}
                </Chip>
              ) : (
                <History size={16} color={colors.muted} />
              )}
            </Card>
          </Pressable>
        );
      })}
      <PunchHistorySheet punchId={openId} onClose={() => setOpenId(null)} timezone={timezone} locale={locale} />
    </View>
  );
}

/** Who did what to one punch, oldest first. Loaded when opened, never from a stale cache. */
export function PunchHistorySheet({
  punchId,
  onClose,
  timezone,
  locale,
}: { punchId: string | null; onClose: () => void } & Zone) {
  const { colors } = useTheme();
  const history = useQuery({
    queryKey: keys.punchHistory(punchId ?? ""),
    queryFn: () => api.punches.history(punchId!),
    enabled: !!punchId,
    staleTime: 0,
  });
  return (
    <Sheet open={!!punchId} onClose={onClose} title={t("common.punchHistory.title")}>
      {history.isPending ? (
        <ActivityIndicator color={colors.ink} style={{ height: 120 }} />
      ) : history.isError ? (
        <LoadError onRetry={() => void history.refetch()} />
      ) : history.data.entries.length === 0 ? (
        <Txt size={14} tone="muted">
          {t("common.punchHistory.empty")}
        </Txt>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 14 }}>
          {history.data.entries.map((e) => (
            <Entry key={e.id} entry={e} timezone={timezone} locale={locale} />
          ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

function Entry({ entry, timezone, locale }: { entry: PunchHistoryEntry } & Zone) {
  const { colors } = useTheme();
  const when = (iso: string) => {
    const d = new Date(iso);
    return t("common.punchHistory.when", {
      date: formatShortDate(d, timezone, locale),
      time: formatTime(d, timezone, locale),
    });
  };
  // A correction can move a time to another day: then the day is shown with it.
  const value = (line: HistoryLine, v: string | undefined, other: string | undefined) => {
    if (!v) return t("common.punchHistory.none");
    if (line.field === "siteName") return v;
    const d = new Date(v);
    if (!other || formatShortDate(d, timezone, locale) === formatShortDate(new Date(other), timezone, locale))
      return formatTime(d, timezone, locale);
    return when(v);
  };
  const who =
    entry.actorRole === "support"
      ? t("common.punchHistory.support")
      : entry.bySelf || entry.actorRole === "system"
        ? entry.actorName
        : t("common.punchHistory.byRole", { name: entry.actorName, role: t(`common.roles.${entry.actorRole}`) });
  const isChange = entry.action === "edit" || entry.action === "delete";
  return (
    <View style={styles.entry}>
      <View style={[styles.dot, { backgroundColor: isChange ? colors.warnDot : colors.muted3 }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight="medium">
          {t(`common.punchHistory.actions.${entry.action}`)}
        </Txt>
        {historyLines(entry).map((line) => (
          <Txt key={line.field} size={14} tabular>
            <Txt size={14} tone="muted">
              {t(`common.punchHistory.fields.${line.field}`)}{" "}
            </Txt>
            {line.change ? (
              <>
                <Txt size={14} tone="muted" style={styles.old}>
                  {value(line, line.before, line.after)}
                </Txt>
                {" → "}
                <Txt size={14} weight="medium">
                  {value(line, line.after, line.before)}
                </Txt>
              </>
            ) : (
              <Txt size={14} weight="medium">
                {value(line, line.after, undefined)}
              </Txt>
            )}
          </Txt>
        ))}
        <Txt size={13} tone="muted">
          {who} · {when(entry.at)}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: touch.min },
  scroll: { maxHeight: 420 },
  entry: { flexDirection: "row", gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  old: { textDecorationLine: "line-through" },
});
