import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock3, MapPinPlus } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Txt } from "../../components/ui/text";
import { useToast } from "../../components/ui/toast";
import { api, keys } from "../../lib/api";
import type { ReviewItem } from "../../lib/api-types";
import { formatDistance, formatShortDate, formatTime, keyToDate } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import { errorText } from "../worker/payment-card";

/** One line of the office review queue, mirroring the web dashboard's list. */
export function ReviewCard({ item, timezone, locale }: { item: ReviewItem; timezone: string; locale: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const approve = useMutation({
    mutationFn: (punchId: string) => api.office.approve(punchId),
    onSuccess: () => {
      toast.ok(t("office.review.approved"));
      qc.invalidateQueries({ queryKey: keys.officeToday });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const time = (iso: string) => formatTime(new Date(iso), timezone, locale);
  let title: string;
  let detail: string;
  let Icon = AlertTriangle;
  let punchId: string | undefined;
  if (item.kind === "far_from_site") {
    title = t("office.review.far", { name: item.name });
    detail =
      item.distanceMeters !== undefined
        ? t("office.review.farDetail", { time: time(item.punch.clockIn.at), distance: formatDistance(item.distanceMeters, locale) })
        : t("office.review.farNoGps", { time: time(item.punch.clockIn.at) });
    punchId = item.punch.id;
  } else if (item.kind === "missing_clock_out") {
    title = t("office.review.missing", { name: item.name });
    detail = t("office.review.missingDetail", { day: formatShortDate(keyToDate(item.punch.dayKey), "UTC", locale), time: time(item.punch.clockIn.at) });
    Icon = Clock3;
  } else {
    title = t("office.review.suggested");
    detail = `${item.suggestion.address ?? ""} · ${t("office.review.suggestedDetail", { count: item.suggestion.punchCount })}`.replace(/^ · /, "");
    Icon = MapPinPlus;
  }

  return (
    <Card style={styles.row}>
      <View style={styles.icon}>
        <Icon size={18} color={colors.warn} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight="medium">
          {title}
        </Txt>
        <Txt size={13} tone="muted">
          {detail}
        </Txt>
      </View>
      {punchId && (
        <Button size="md" variant="secondary" loading={approve.isPending} onPress={() => approve.mutate(punchId)}>
          {t("office.review.approve")}
        </Button>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 36, height: 36, borderRadius: radii.pill, backgroundColor: colors.warnBg, alignItems: "center", justifyContent: "center" },
});
