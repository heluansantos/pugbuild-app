import * as Location from "expo-location";
import { useEffect, useState } from "react";
import type { GeoPoint } from "../../lib/api-types";

export type GeoStatus = "idle" | "locating" | "ready" | "denied" | "unavailable";

export interface GeoState {
  status: GeoStatus;
  position: GeoPoint | null;
}

/** Watches the phone position while mounted. Degrades gracefully without permission. */
export function useGeolocation(enabled = true): GeoState {
  const [state, setState] = useState<GeoState>({ status: enabled ? "locating" : "idle", position: null });

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") {
        setState({ status: "denied", position: null });
        return;
      }
      try {
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 10 },
          (pos) => {
            setState({
              status: "ready",
              position: {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: Math.round(pos.coords.accuracy ?? 0),
              },
            });
          },
        );
      } catch {
        if (!cancelled) setState({ status: "unavailable", position: null });
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return state;
}
