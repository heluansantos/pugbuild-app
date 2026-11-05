import type { AssetSighting, GeoPoint } from "../../lib/api-types";
import { distanceMeters } from "../../lib/geo";

/* Pure rules for layer 2 sightings (docs/FLEET.md in pugbuild-web): what a phone reports, and when. */

/** A tag is reported again only after this long, or sooner when the phone moved this far. */
export const REPORT_EVERY_MS = 5 * 60_000;
export const MOVED_METERS = 150;
/** A rough fix says nothing useful about where the tag is. */
export const MAX_ACCURACY_M = 250;
/** One call carries at most this many sightings (the server caps it too). */
export const MAX_PER_CALL = 20;

export interface SeenTag {
  uuid: string;
  major: number;
  minor: number;
  rssi?: number;
}

export const tagKey = (t: Pick<SeenTag, "uuid" | "major" | "minor">) => `${t.uuid.toLowerCase()}:${t.major}:${t.minor}`;

/** A phone position good enough to stamp on a tag: fresh GPS, not simulated, not hundreds of meters off. */
export function usablePosition(p: GeoPoint | null | undefined): p is GeoPoint {
  return Boolean(p && !p.mocked && (p.accuracy ?? 0) <= MAX_ACCURACY_M);
}

/**
 * Keeps the last report per tag and decides which of the tags heard now are worth sending:
 * never seen, seen long ago, or seen from somewhere else. Pure and small enough to unit-test.
 */
export class SightingThrottle {
  private last = new Map<string, { at: number; point: GeoPoint }>();

  pick(tags: readonly SeenTag[], position: GeoPoint, now = Date.now()): AssetSighting[] {
    const out: AssetSighting[] = [];
    const seen = new Set<string>();
    for (const tag of tags) {
      const key = tagKey(tag);
      if (seen.has(key)) continue;
      seen.add(key);
      const prev = this.last.get(key);
      const due = !prev || now - prev.at >= REPORT_EVERY_MS || distanceMeters(prev.point, position) >= MOVED_METERS;
      if (!due) continue;
      out.push({
        beacon: { uuid: tag.uuid.toLowerCase(), major: tag.major, minor: tag.minor },
        location: { lat: position.lat, lng: position.lng, accuracy: position.accuracy },
        at: new Date(now).toISOString(),
        rssi: tag.rssi,
      });
      if (out.length === MAX_PER_CALL) break;
    }
    return out;
  }

  /** Called once the server accepted the batch, so a failed call is retried on the next cycle. */
  commit(sightings: readonly AssetSighting[], now = Date.now()) {
    for (const s of sightings) {
      if (!s.beacon) continue;
      this.last.set(tagKey(s.beacon), { at: now, point: s.location });
    }
  }

  reset() {
    this.last.clear();
  }
}
