import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MapPin, Navigation } from "lucide-react-native";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Card } from "../../components/ui/card";
import { Chip } from "../../components/ui/chip";
import { EmptyState } from "../../components/ui/empty-state";
import { Txt } from "../../components/ui/text";
import { useMe, useLocale } from "../session/session";
import { openSiteInMaps } from "./open-in-maps";
import { useGeolocation } from "./use-geolocation";
import { api, keys } from "../../lib/api";
import { formatDistance } from "../../lib/format";
import { distanceMeters } from "../../lib/geo";
import { t } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

/** Active job sites by distance, each with a directions shortcut. Rendered inside the Tasks tab. */
export function SitesList() {
  const me = useMe();
  const router = useRouter();
  const locale = useLocale();
  const sites = useQuery({ queryKey: keys.sites, queryFn: api.sites });
  const list = sites.data?.sites ?? [];
  const geo = useGeolocation(list.length > 0);
  const rows = list
    .map((site) => ({ site, d: geo.position ? distanceMeters(geo.position, site.location) : null }))
    .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity));

  return (
    <View style={{ gap: 16 }}>
      {sites.isPending && <ActivityIndicator color={colors.ink} />}
      {sites.isSuccess && list.length === 0 && <EmptyState icon={<MapPin size={20} color={colors.ink} />} title={t("common.states.empty")} body={t("worker.sites.empty")} />}
      {rows.map(({ site, d }, i) => {
        const here = d !== null && d <= (site.radiusMeters ?? me.company.settings.siteRadiusMeters);
        return (
          <Animated.View key={site.id} entering={FadeInUp.delay(i * 40).duration(300)}>
            <Pressable onPress={() => router.push({ pathname: "/site/[id]", params: { id: site.id } })} accessibilityRole="button" accessibilityLabel={site.name}>
            <Card style={styles.row}>
              {site.photos[0] ? (
                <Image source={{ uri: site.photos[0].url }} style={[styles.photo, here && styles.hereRing]} accessibilityIgnoresInvertColors />
              ) : (
                <View style={[styles.icon, here && { backgroundColor: colors.okBg }]}>
                  <MapPin size={20} color={here ? colors.ok : colors.ink} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={16} weight="medium" numberOfLines={1}>
                  {site.name}
                </Txt>
                <Txt size={13} tone="muted" numberOfLines={2}>
                  {site.description || site.address}
                </Txt>
              </View>
              <View style={styles.trail}>
                {d !== null && <Chip tone={here ? "ok" : "neutral"} size="sm">{here ? t("worker.sites.here") : t("worker.sites.away", { distance: formatDistance(d, locale) })}</Chip>}
                {/* Only sites the office confirmed are listed here, so directions always point at a real address. */}
                <Pressable onPress={() => void openSiteInMaps(site)} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={t("worker.sites.openInMaps")} hitSlop={6}>
                  <Navigation size={18} color={colors.ink} />
                </Pressable>
              </View>
            </Card>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  photo: { width: 48, height: 48, borderRadius: radii.icon, backgroundColor: colors.bg },
  hereRing: { borderWidth: 2, borderColor: colors.ok },
  icon: { width: 48, height: 48, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  trail: { alignItems: "flex-end", gap: 8 },
  navBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});
