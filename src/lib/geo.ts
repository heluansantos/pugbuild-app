import type { GeoPoint } from "./api-types";

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in meters. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface SiteLike {
  id: string;
  name: string;
  location: GeoPoint;
  radiusMeters?: number | null;
}

export interface NearestSite<S extends SiteLike = SiteLike> {
  site: S;
  distanceMeters: number;
  withinRadius: boolean;
}

/** Closest active site to a point, with whether the point is inside its radius. */
export function nearestSite<S extends SiteLike>(
  point: GeoPoint,
  sites: readonly S[],
  defaultRadiusMeters: number,
): NearestSite<S> | null {
  let best: NearestSite<S> | null = null;
  for (const site of sites) {
    const d = distanceMeters(point, site.location);
    if (!best || d < best.distanceMeters) {
      const radius = site.radiusMeters ?? defaultRadiusMeters;
      best = { site, distanceMeters: d, withinRadius: d <= radius };
    }
  }
  return best;
}
