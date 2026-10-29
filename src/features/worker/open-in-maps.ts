import { ActionSheetIOS, Linking, Platform } from "react-native";
import type { SiteDto } from "../../lib/api-types";
import { t } from "../../lib/i18n";

interface MapsApp {
  label: string;
  url: string;
  scheme?: string;
}

const webDirections = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Tries each URL in order; the first app that accepts it wins, the web map is the last resort. */
async function openFirst(urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // not installed: try the next one
    }
  }
}

/** Lets the person pick a navigation app for a job site; apps that are not installed are skipped. */
export async function openSiteInMaps(site: SiteDto) {
  const { lat, lng } = site.location;
  const label = encodeURIComponent(site.name);
  if (Platform.OS === "android") {
    // Android 11+ hides other apps from canOpenURL unless declared, so just try: Google Maps navigation,
    // any maps app via geo:, then the browser.
    await openFirst([`google.navigation:q=${lat},${lng}`, `geo:${lat},${lng}?q=${lat},${lng}(${label})`, webDirections(lat, lng)]);
    return;
  }
  const candidates: MapsApp[] = [
    { label: t("worker.sites.appleMaps"), url: `maps://?daddr=${lat},${lng}&q=${label}` },
    { label: t("worker.sites.googleMaps"), url: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, scheme: "comgooglemaps://" },
    { label: t("worker.sites.waze"), url: `waze://?ll=${lat},${lng}&navigate=yes`, scheme: "waze://" },
  ];
  const installed: MapsApp[] = [];
  for (const c of candidates) {
    if (!c.scheme || (await Linking.canOpenURL(c.scheme).catch(() => false))) installed.push(c);
  }
  const options = installed.length > 0 ? installed : [{ label: t("worker.sites.googleMaps"), url: webDirections(lat, lng) }];
  if (options.length === 1) return openFirst([options[0]!.url, webDirections(lat, lng)]);
  ActionSheetIOS.showActionSheetWithOptions(
    { title: t("worker.sites.chooseMaps"), options: [...options.map((o) => o.label), t("common.actions.cancel")], cancelButtonIndex: options.length },
    (i) => {
      const pick = options[i];
      if (pick) void openFirst([pick.url, webDirections(lat, lng)]);
    },
  );
}
