import { MapPin, MapPinOff } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { Txt } from "../../components/ui/text";
import type { SiteDto } from "../../lib/api-types";
import { formatDistance } from "../../lib/format";
import type { NearestSite } from "../../lib/geo";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import type { GeoStatus } from "./use-geolocation";

const COARSE_METERS = 150;

export function NearbyCard({ status, nearest, hasSites, locale, accuracy }: { status: GeoStatus; nearest: NearestSite<SiteDto> | null; hasSites: boolean; locale: string; accuracy?: number }) {
  // iOS "Precise Location: Off" (or a weak fix) reports hundreds of meters: the punch would land far from the site.
  const coarse = status === "ready" && accuracy !== undefined && accuracy > COARSE_METERS;
  const denied = status === "denied" || status === "unavailable";
  const title = !hasSites ? t("worker.home.noSites") : denied ? t("worker.home.locationDenied") : nearest ? nearest.site.name : t("worker.home.locating");
  const label = nearest ? (nearest.withinRadius ? t("worker.home.nearYou") : t("worker.home.nearestSite")) : null;
  return (
    <View style={{ gap: 8 }}>
    <Card style={styles.row}>
      <View style={[styles.icon, denied && { backgroundColor: colors.warnBg }]}>
        {denied ? <MapPinOff size={20} color={colors.warn} /> : <MapPin size={20} color={colors.ink} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <Txt size={13} tone="muted">
            {label}
          </Txt>
        )}
        <Txt size={nearest ? 16 : 14} weight={nearest ? "medium" : "regular"} tone={nearest ? "ink" : "muted"} numberOfLines={2}>
          {title}
        </Txt>
      </View>
      <View style={styles.trail}>
        {nearest && <Chip tone={nearest.withinRadius ? "ok" : "warn"} size="sm">{formatDistance(nearest.distanceMeters, locale)}</Chip>}
        {status === "ready" && accuracy !== undefined && (
          <Txt size={11} tone={coarse ? "danger" : "muted2"} tabular>
            {t("worker.home.gpsAccuracy", { meters: accuracy })}
          </Txt>
        )}
      </View>
    </Card>
    {coarse && (
      <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button" style={styles.hint}>
        <Txt size={13} tone="warn" style={{ flex: 1 }}>
          {t("worker.home.approxLocation")}
        </Txt>
        <Txt size={13} weight="semibold" tone="warn">
          {t("worker.home.openSettings")}
        </Txt>
      </Pressable>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  trail: { alignItems: "flex-end", gap: 4 },
  hint: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.card, backgroundColor: colors.warnBg },
});
