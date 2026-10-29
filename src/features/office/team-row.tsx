import { StyleSheet, View } from "react-native";
import { Avatar } from "../../components/ui/avatar";
import { Chip, type ChipTone } from "../../components/ui/chip";
import { Txt } from "../../components/ui/text";
import type { TeamRow as TeamRowDto } from "../../lib/api-types";
import { formatMinutes, formatMoney, formatTime } from "../../lib/format";
import { t } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

const TONES: Record<TeamRowDto["status"], ChipTone> = { working: "ok", done: "neutral", off: "neutral" };

/** Who is on site right now, with today's hours and cost. */
export function TeamRow({ row, timezone, locale }: { row: TeamRowDto; timezone: string; locale: string }) {
  const status = row.missingClockOut ? t("office.team.missing") : t(`office.team.${row.status}`);
  const tone: ChipTone = row.missingClockOut || row.farFromSite ? "warn" : TONES[row.status];
  const sub = [
    row.clockInAt ? formatTime(new Date(row.clockInAt), timezone, locale) : null,
    row.clockOutAt ? formatTime(new Date(row.clockOutAt), timezone, locale) : null,
    row.farFromSite ? t("office.team.far") : row.siteName,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.row}>
      <Avatar name={row.name} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight="medium" numberOfLines={1}>
          {row.name}
        </Txt>
        <Txt size={12} tone="muted" numberOfLines={1}>
          {sub || t("office.team.off")}
        </Txt>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Chip tone={tone} size="sm" dot={row.status === "working"}>
          {status}
        </Chip>
        {row.minutes > 0 && (
          <Txt size={12} tone="muted" tabular>
            {formatMinutes(row.minutes)} · {formatMoney(row.costCents, locale)}
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2 },
});
