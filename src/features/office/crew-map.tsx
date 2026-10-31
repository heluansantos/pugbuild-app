import { memo, useCallback, useEffect, useRef, useState, type ComponentType, type RefAttributes } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import { colors } from "../../theme/tokens";
import type { CrewMapData } from "./map-data";

const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist";

// The package types `WebView<P = undefined>` as `Component<WebViewProps & P>`, which the current
// TypeScript folds into `never`. Name the props ourselves; the runtime component is unchanged.
const Web = WebView as unknown as ComponentType<WebViewProps & RefAttributes<WebView>>;

/**
 * One HTML page with Leaflet on OpenStreetMap tiles, the same base and palette as the dashboard
 * map. Data goes in through postMessage so a position update moves a dot without reloading.
 * No API key, no native module: it works in Expo Go and in store builds alike.
 */
const html = (interactive: boolean) => `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${LEAFLET}/leaflet.css">
<style>
  html,body,#m{margin:0;height:100%;background:#eeece6;font-family:-apple-system,system-ui,sans-serif}
  .leaflet-control-attribution{display:none}
  .pb-tip{font-size:12px;font-weight:600;color:${colors.ink};background:#fff;border:1px solid ${colors.line};border-radius:999px;padding:4px 9px;box-shadow:none;white-space:nowrap}
  .pb-tip::before{display:none}
  .pb-tip.dark{background:${colors.ink};color:#fff;border-color:${colors.ink}}
  .pb-tip.sm{font-size:11px;padding:3px 7px}
  .pb-live{display:block;width:16px;height:16px;border-radius:999px;background:${colors.accent};border:3px solid ${colors.ink};box-shadow:0 0 0 0 rgba(255,200,61,.55);animation:pb 2.4s ease-out infinite}
  @keyframes pb{0%{box-shadow:0 0 0 0 rgba(255,200,61,.55)}100%{box-shadow:0 0 0 12px rgba(255,200,61,0)}}
  .pb-dot{display:block;width:13px;height:13px;border-radius:999px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)}
</style></head><body><div id="m"></div>
<script src="${LEAFLET}/leaflet.js"></script>
<script>
  var map = L.map('m', { zoomControl: false, dragging: ${interactive}, touchZoom: ${interactive}, scrollWheelZoom: false, doubleClickZoom: ${interactive}, boxZoom: false, keyboard: false, tap: ${interactive}, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var fitted = false;
  function icon(cls, color) { return L.divIcon({ className: '', html: '<span class="' + cls + '"' + (color ? ' style="background:' + color + '"' : '') + '></span>', iconSize: [16, 16], iconAnchor: [8, 8] }); }
  function render(d) {
    layer.clearLayers();
    var pts = [];
    d.sites.forEach(function (s) {
      L.circle([s.lat, s.lng], { radius: s.radiusMeters, color: '${colors.muted}', weight: 1.5, dashArray: '6 6', fillColor: '${colors.accent}', fillOpacity: 0.14 })
        .bindTooltip(s.name + (s.count ? ' · ' + s.count : ''), { permanent: true, direction: 'bottom', offset: [0, 8], className: 'pb-tip dark' + (${interactive} ? '' : ' sm') })
        .addTo(layer);
      pts.push([s.lat, s.lng]);
    });
    d.people.forEach(function (p) {
      var ic = p.live ? icon('pb-live') : icon('pb-dot', p.far ? '${colors.warnDot}' : '${colors.ink}');
      // Names only on the full map: in the small card they would pile up over each other.
      L.marker([p.lat, p.lng], { icon: ic, zIndexOffset: p.live ? 1000 : 0 })
        .bindTooltip(p.name + (p.siteName ? ' · ' + p.siteName : ''), { permanent: ${interactive}, direction: 'top', offset: [0, -9], className: 'pb-tip' })
        .addTo(layer);
      pts.push([p.lat, p.lng]);
    });
    if (!fitted && pts.length) {
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15, animate: false });
      fitted = true;
    } else if (!pts.length && !fitted) map.setView([42.6334, -71.3162], 11);
  }
  function onMessage(e) { try { render(JSON.parse(e.data)); } catch (err) {} }
  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;

export const CrewMap = memo(function CrewMap({ data, interactive = false, style }: { data: CrewMapData; interactive?: boolean; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const push = useCallback((d: CrewMapData) => ref.current?.postMessage(JSON.stringify(d)), []);
  useEffect(() => {
    if (ready) push(data);
  }, [ready, data, push]);
  return (
    <View style={[styles.wrap, style]} pointerEvents={interactive ? "auto" : "none"}>
      <Web
        ref={ref}
        originWhitelist={["*"]}
        source={{ html: html(interactive), baseUrl: "https://pugbuild.com" }}
        onMessage={(e: WebViewMessageEvent) => {
          if (e.nativeEvent.data === "ready") setReady(true);
        }}
        javaScriptEnabled
        domStorageEnabled={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback={false}
        style={styles.web}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#EEECE6" },
  web: { flex: 1, backgroundColor: "#EEECE6" },
});
