import type { SiteToday, TodayOverview } from "../../lib/api-types";

/** A live point older than this is treated as unknown (phone off, app closed). */
export const LIVE_MAX_AGE_MS = 45 * 60_000;

export interface CrewSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  /** People clocked in at this site right now. */
  count: number;
}

export interface CrewPerson {
  membershipId: string;
  name: string;
  lat: number;
  lng: number;
  /** True when the dot is a live report; false when it is where the shift was clocked in. */
  live: boolean;
  far: boolean;
  siteId?: string;
  siteName?: string;
  /** ISO time of the position (live report or clock-in). */
  at: string;
}

export interface CrewMapData {
  sites: CrewSite[];
  people: CrewPerson[];
}

/**
 * Where the crew is right now: one dot per open shift, at the live position when the phone has
 * reported one recently, else where the shift was clocked in. Closed shifts are history and stay
 * off the map.
 */
export function buildCrewMap(overview: Pick<TodayOverview, "punches" | "sites" | "team">, defaultRadius: number, now = Date.now()): CrewMapData {
  const names = new Map(overview.team.map((r) => [r.membershipId, r.name]));
  const siteOf = (id?: string): SiteToday | undefined => (id ? overview.sites.find((s) => s.id === id) : undefined);
  const people: CrewPerson[] = [];
  for (const p of overview.punches) {
    if (p.status !== "open") continue;
    const fresh = p.live && now - new Date(p.live.at).getTime() <= LIVE_MAX_AGE_MS ? p.live : undefined;
    const loc = fresh?.location ?? p.clockIn.location;
    if (!loc) continue;
    const siteId = fresh ? fresh.siteId : p.clockIn.siteId;
    people.push({
      membershipId: p.membershipId,
      name: names.get(p.membershipId) ?? "—",
      lat: loc.lat,
      lng: loc.lng,
      live: !!fresh,
      far: fresh ? !fresh.siteId : p.flags.includes("far_from_site"),
      siteId,
      siteName: siteOf(siteId)?.name,
      at: fresh ? fresh.at : p.clockIn.at,
    });
  }
  const sites: CrewSite[] = overview.sites.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.location.lat,
    lng: s.location.lng,
    radiusMeters: s.radiusMeters ?? defaultRadius,
    count: people.filter((p) => p.siteId === s.id).length,
  }));
  return { sites, people };
}
