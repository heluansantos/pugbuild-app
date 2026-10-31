import { buildCrewMap } from "../features/office/map-data";
import type { PunchDto, SiteToday, TeamRow } from "../lib/api-types";

const now = Date.parse("2026-10-29T15:00:00Z");
const punch = (over: Partial<PunchDto> & Pick<PunchDto, "id" | "membershipId">): PunchDto => ({
  companyId: "c",
  personId: over.membershipId,
  dayKey: "2026-10-29",
  weekKey: "2026-10-28",
  clockIn: { at: "2026-10-29T11:00:00Z", location: { lat: 42.6, lng: -71.3 }, siteId: "s1" },
  status: "open",
  flags: [],
  ...over,
});
const site = { id: "s1", name: "Plaza", location: { lat: 42.6, lng: -71.3 }, radiusMeters: 150 } as SiteToday;
const team = [
  { membershipId: "m1", name: "Ana" },
  { membershipId: "m2", name: "Bia" },
  { membershipId: "m3", name: "Caio" },
] as TeamRow[];

describe("crew map", () => {
  it("shows open shifts at their live position, else at the clock-in, and skips closed ones", () => {
    const data = buildCrewMap(
      {
        punches: [
          punch({ id: "p1", membershipId: "m1", live: { at: "2026-10-29T14:50:00Z", location: { lat: 42.7, lng: -71.2 }, siteId: undefined } }),
          punch({ id: "p2", membershipId: "m2", flags: ["far_from_site"], clockIn: { at: "2026-10-29T11:00:00Z", location: { lat: 42.65, lng: -71.25 } } }),
          punch({ id: "p3", membershipId: "m3", status: "closed", clockOut: { at: "2026-10-29T13:00:00Z" } }),
        ],
        sites: [site],
        team,
      },
      100,
      now,
    );
    expect(data.people.map((p) => [p.name, p.live, p.far])).toEqual([
      ["Ana", true, true],
      ["Bia", false, true],
    ]);
    expect(data.people[0]?.lat).toBe(42.7);
  });

  it("falls back to the clock-in when the live point is stale", () => {
    const data = buildCrewMap(
      {
        punches: [punch({ id: "p1", membershipId: "m1", live: { at: "2026-10-29T13:00:00Z", location: { lat: 42.9, lng: -71.0 } } })],
        sites: [site],
        team,
      },
      100,
      now,
    );
    expect(data.people[0]).toMatchObject({ live: false, lat: 42.6, siteName: "Plaza" });
    expect(data.sites[0]?.count).toBe(1);
  });
});
