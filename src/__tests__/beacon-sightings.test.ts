import { MAX_PER_CALL, SightingThrottle, tagKey, usablePosition } from "../features/worker/beacon-sightings";

const here = { lat: 42.6, lng: -71.3, accuracy: 10 };
const bobcat = { uuid: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0", major: 1, minor: 1, rssi: -60 };
const mixer = { uuid: "e2c56db5-dffb-48d2-b060-d0f5a71096e0", major: 1, minor: 2 };

describe("beacon sightings", () => {
  it("only stamps a tag with a usable phone position", () => {
    expect(usablePosition(here)).toBe(true);
    expect(usablePosition({ ...here, accuracy: 900 })).toBe(false);
    expect(usablePosition({ ...here, mocked: true })).toBe(false);
    expect(usablePosition(null)).toBe(false);
  });

  it("reports a tag once, then again after five minutes or a 150 m move", () => {
    const t = new SightingThrottle();
    const now = Date.parse("2026-11-04T12:00:00Z");
    const first = t.pick([bobcat, mixer, bobcat], here, now);
    expect(first.map((s) => tagKey(s.beacon!))).toEqual([
      "e2c56db5-dffb-48d2-b060-d0f5a71096e0:1:1",
      "e2c56db5-dffb-48d2-b060-d0f5a71096e0:1:2",
    ]);
    expect(first[0]).toMatchObject({ location: here, at: "2026-11-04T12:00:00.000Z", rssi: -60 });
    // Not committed (call failed): the next cycle sends them again.
    expect(t.pick([bobcat], here, now + 1_000)).toHaveLength(1);
    t.commit(first, now);
    expect(t.pick([bobcat, mixer], here, now + 60_000)).toHaveLength(0);
    expect(t.pick([bobcat], here, now + 5 * 60_000)).toHaveLength(1);
    expect(t.pick([mixer], { ...here, lat: here.lat + 0.002 }, now + 60_000)).toHaveLength(1);
  });

  it("caps a batch at the server's limit", () => {
    const t = new SightingThrottle();
    const many = Array.from({ length: 30 }, (_, i) => ({ ...mixer, minor: i }));
    expect(t.pick(many, here)).toHaveLength(MAX_PER_CALL);
  });
});
