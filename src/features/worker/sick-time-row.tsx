import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Card } from "../../components/ui/card";
import { Txt } from "../../components/ui/text";
import { api, keys } from "../../lib/api";
import { formatMinutes, formatShortDate, keyToDate } from "../../lib/format";
import { t } from "../../lib/i18n";

/**
 * Earned sick time in one row: what is available, and how it got there. Renders nothing while
 * the company has it off, while loading, and against a server that predates the endpoint.
 */
export function SickTimeRow({ locale }: { locale: string }) {
  const sick = useQuery({ queryKey: keys.sickTime, queryFn: api.sickTime, staleTime: 5 * 60_000, retry: false });
  const data = sick.data;
  if (!data?.enabled) return null;
  return (
    <Card
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      accessible
      accessibilityLabel={`${t("worker.sickTime.title")}: ${t("worker.sickTime.available", { time: formatMinutes(data.availableMinutes) })}`}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight="medium">
          {t("worker.sickTime.title")}
          {!data.paid && (
            <Txt size={12} tone="muted">
              {"  "}
              {t("worker.sickTime.unpaid")}
            </Txt>
          )}
        </Txt>
        <Txt size={13} tone="muted">
          {data.eligible
            ? t("worker.sickTime.detail", {
                accrued: formatMinutes(data.accruedMinutes),
                used: formatMinutes(data.usedMinutes),
              })
            : // Day keys are calendar dates: formatting them in UTC keeps the day.
              t("worker.sickTime.eligibleFrom", { date: formatShortDate(keyToDate(data.eligibleFromKey), "UTC", locale) })}
        </Txt>
      </View>
      <Txt size={16} weight="semibold" tabular>
        {t("worker.sickTime.available", { time: formatMinutes(data.availableMinutes) })}
      </Txt>
    </Card>
  );
}
