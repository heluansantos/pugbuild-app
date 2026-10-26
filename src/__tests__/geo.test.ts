import { distanceMeters, nearestSite } from "../lib/geo";

const boston = { lat: 42.3601, lng: -71.0589 };
const sites = [
  { id: "a", name: "Downtown", location: { lat: 42.3605, lng: -71.0595 } },
  { id: "b", name: "Cambridge", location: { lat: 42.3736, lng: -71.1097 }, radiusMeters: 200 },
];

describe("geo", () => {
  it("measures distance", () => {
    expect(Math.round(distanceMeters(boston, sites[1]!.location))).toBeGreaterThan(4000);
  });
  it("picks the nearest site and checks its radius", () => {
    const n = nearestSite(boston, sites, 150);
    expect(n?.site.id).toBe("a");
    expect(n?.withinRadius).toBe(true);
  });
});
