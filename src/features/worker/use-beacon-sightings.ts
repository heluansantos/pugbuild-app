import { useEffect, useMemo, useRef } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import BeaconScanner from "../../../modules/beacon-scanner/src/BeaconScannerModule";
import type { SeenBeacon } from "../../../modules/beacon-scanner/src/BeaconScanner.types";
import { api } from "../../lib/api";
import type { GeoPoint } from "../../lib/api-types";
import { SightingThrottle, usablePosition } from "./beacon-sightings";

/**
 * Layer 2 of the fleet plan: while the clock screen is open, the phone listens for the company's
 * beacon tags and tells the server where it heard them. Foreground only (no new permission: it
 * rides on the location access the clock already has), throttled per tag, silent on failure.
 * Nothing runs when the company has no beacon assets or the device cannot range (Simulator).
 */
export function useBeaconSightings(position: GeoPoint | null, uuids: readonly string[]): void {
  const throttle = useMemo(() => new SightingThrottle(), []);
  const latest = useRef<GeoPoint | null>(position);
  useEffect(() => {
    latest.current = position;
  }, [position]);
  // A stable key so re-renders with the same list do not restart ranging.
  const key = [...uuids]
    .map((u) => u.toLowerCase())
    .sort()
    .join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let ranging = false;
    let inFlight = false;
    const list = key.split(",");

    const report = async (beacons: SeenBeacon[]) => {
      const point = latest.current;
      if (inFlight || !usablePosition(point)) return;
      const batch = throttle.pick(beacons, point);
      if (batch.length === 0) return;
      inFlight = true;
      try {
        await api.fleet.reportSightings(batch);
        throttle.commit(batch);
      } catch {
        // Offline or fleet turned off meanwhile: the next cycle tries again.
      } finally {
        inFlight = false;
      }
    };

    const start = async () => {
      if (cancelled || ranging) return;
      if (!(await allowed())) return;
      if (!BeaconScanner.isAvailable()) return;
      try {
        await BeaconScanner.startRanging(list);
        ranging = true;
      } catch {
        // Ranging unavailable on this device.
      }
    };
    const stop = () => {
      if (!ranging) return;
      ranging = false;
      void BeaconScanner.stopRanging().catch(() => undefined);
    };

    const sub = BeaconScanner.addListener("onBeacons", (e) => void report(e.beacons));
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void start();
      else stop();
    });
    if (AppState.currentState === "active") void start();
    return () => {
      cancelled = true;
      stop();
      sub.remove();
      appState.remove();
      throttle.reset();
    };
  }, [key, throttle]);
}

/** Android 12+ needs BLUETOOTH_SCAN at runtime; iOS ranging uses the location permission already granted. */
async function allowed(): Promise<boolean> {
  if (Platform.OS !== "android" || Platform.Version < 31) return true;
  try {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
