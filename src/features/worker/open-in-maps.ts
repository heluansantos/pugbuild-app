import { ActionSheetIOS, Alert, Linking, Platform } from "react-native";
import type { SiteDto } from "../../lib/api-types";
import { t } from "../../lib/i18n";

interface MapsApp {
  label: string;
  url: string;
  scheme?: string;
}

/** Lets the person pick a navigation app for a job site; apps that are not installed are skipped. */
export async function openSiteInMaps(site: SiteDto) {
  const { lat, lng } = site.location;
  const label = encodeURIComponent(site.name);
  const candidates: MapsApp[] = [
    { label: t("worker.sites.appleMaps"), url: `maps://?daddr=${lat},${lng}&q=${label}` },
    { label: t("worker.sites.googleMaps"), url: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, scheme: "comgooglemaps://" },
    { label: t("worker.sites.waze"), url: `waze://?ll=${lat},${lng}&navigate=yes`, scheme: "waze://" },
  ];
  if (Platform.OS !== "ios") candidates[0] = { label: t("worker.sites.googleMaps"), url: `geo:${lat},${lng}?q=${lat},${lng}(${label})` };
  const installed: MapsApp[] = [];
  for (const c of candidates) {
    if (!c.scheme || (await Linking.canOpenURL(c.scheme).catch(() => false))) installed.push(c);
  }
  // Google Maps on the web always works, even with nothing installed.
  const webFallback: MapsApp = { label: t("worker.sites.googleMaps"), url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` };
  const options = installed.length > 0 ? installed : [webFallback];
  if (options.length === 1) return Linking.openURL(options[0]!.url);
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: t("worker.sites.chooseMaps"), options: [...options.map((o) => o.label), t("common.actions.cancel")], cancelButtonIndex: options.length },
      (i) => {
        const pick = options[i];
        if (pick) void Linking.openURL(pick.url);
      },
    );
    return;
  }
  Alert.alert(t("worker.sites.chooseMaps"), undefined, [...options.map((o) => ({ text: o.label, onPress: () => void Linking.openURL(o.url) })), { text: t("common.actions.cancel"), style: "cancel" }]);
}
