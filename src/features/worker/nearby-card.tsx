import { MapPin, MapPinOff } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { Txt } from "../../components/ui/text";
import type { SiteDto } from "../../lib/api-types";
import { formatDistance } from "../../lib/format";
import type { NearestSite } from "../../lib/geo";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import type { GeoStatus } from "./use-geolocation";

export function NearbyCard({ status, nearest, hasSites, locale }: { status: GeoStatus; nearest: NearestSite<SiteDto> | null; hasSites: boolean; locale: string }) {
  const denied = status === "denied" || status === "unavailable";
  const title = !hasSites ? t("worker.home.noSites") : denied ? t("worker.home.locationDenied") : nearest ? nearest.site.name : t("worker.home.locating");
  const label = nearest ? (nearest.withinRadius ? t("worker.home.nearYou") : t("worker.home.nearestSite")) : null;
  return (
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
      {nearest && <Chip tone={nearest.withinRadius ? "ok" : "warn"} size="sm">{formatDistance(nearest.distanceMeters, locale)}</Chip>}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
