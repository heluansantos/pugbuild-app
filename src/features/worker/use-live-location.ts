import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { api } from "../../lib/api";
import type { GeoPoint, PunchDto } from "../../lib/api-types";
import { distanceMeters } from "../../lib/geo";

/** How often a position goes to the office while the person stays put, and when they move. */
const REPORT_EVERY_MS = 5 * 60_000;
const MOVED_METERS = 150;
const MIN_GAP_MS = 60_000;
/** A fix this rough says nothing about which site the person is at. */
const MAX_ACCURACY_M = 250;

/**
 * Sends the phone's position to the office while a shift is open and the app is in the foreground.
 * It piggybacks on the position watch the screen already runs (no second GPS session), reports
 * at most every five minutes unless the person moved, and stops the moment the shift ends or the
 * app goes to the background. Failures are silent: the map is a convenience, the punch is not.
 */
export function useLiveLocation(punch: PunchDto, position: GeoPoint | null): void {
  const last = useRef<{ at: number; point: GeoPoint } | null>(null);
  const latest = useRef<GeoPoint | null>(position);
  useEffect(() => {
    latest.current = position;
  }, [position]);
  // A shift queued offline has no server punch yet: nothing to attach a position to.
  const active = punch.status === "open" && !punch.id.startsWith("queued-");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let inFlight = false;

    const send = async (point: GeoPoint, force = false) => {
      if (cancelled || inFlight) return;
      if (point.mocked || (point.accuracy ?? 0) > MAX_ACCURACY_M) return;
      const now = Date.now();
      const prev = last.current;
      if (prev && !force) {
        const sinceMs = now - prev.at;
        if (sinceMs < MIN_GAP_MS) return;
        if (sinceMs < REPORT_EVERY_MS && distanceMeters(prev.point, point) < MOVED_METERS) return;
      }
      inFlight = true;
      try {
        await api.punches.location({ lat: point.lat, lng: point.lng, accuracy: point.accuracy });
        last.current = { at: now, point };
      } catch {
        // Offline or shift already closed on the server: try again on the next fix.
      } finally {
        inFlight = false;
      }
    };

    const tick = () => {
      if (latest.current && AppState.currentState === "active") void send(latest.current);
    };
    tick();
    const timer = setInterval(tick, 30_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && latest.current) void send(latest.current, true);
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      sub.remove();
    };
  }, [active, punch.id]);

  useEffect(() => {
    if (!active || !position) return;
    // A fresh fix while moving: report sooner than the timer would (throttled inside send).
    const moved = last.current && distanceMeters(last.current.point, position) >= MOVED_METERS;
    if (moved && AppState.currentState === "active") {
      void api.punches
        .location({ lat: position.lat, lng: position.lng, accuracy: position.accuracy })
        .then(() => {
          last.current = { at: Date.now(), point: position };
        })
        .catch(() => undefined);
    }
  }, [active, position]);
}
