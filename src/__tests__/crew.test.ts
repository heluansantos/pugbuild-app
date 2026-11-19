import { canUseCrew, chunk, notWorkingIds, splitSelection, summarize, toggleAllNotWorking } from "../features/worker/crew";
import type { CrewMemberDto } from "../lib/api-types";

const member = (id: string, working = false): CrewMemberDto => ({
  membershipId: id,
  personId: `p-${id}`,
  name: id,
  open: working ? { punchId: `punch-${id}`, since: "2026-11-18T12:00:00.000Z", dayKey: "2026-11-18", source: "crew" } : undefined,
});

const crew = [member("a"), member("b", true), member("c"), member("d", true)];

describe("canUseCrew", () => {
  it("is for crew leads and staff, not plain workers", () => {
    expect(canUseCrew({ role: "worker" })).toBe(false);
    expect(canUseCrew({ role: "worker", crewLead: false })).toBe(false);
    expect(canUseCrew({ role: "worker", crewLead: true })).toBe(true);
    expect(canUseCrew({ role: "office" })).toBe(true);
    expect(canUseCrew({ role: "admin" })).toBe(true);
  });
});

describe("splitSelection", () => {
  it("separates who can be started from who can be ended", () => {
    expect(splitSelection(crew, new Set(["a", "b", "d"]))).toEqual({ toStart: ["a"], toEnd: ["b", "d"] });
  });
  it("drops ids that left the list", () => {
    expect(splitSelection(crew, new Set(["gone", "c"]))).toEqual({ toStart: ["c"], toEnd: [] });
  });
  it("is empty with nothing ticked", () => {
    expect(splitSelection(crew, new Set())).toEqual({ toStart: [], toEnd: [] });
  });
});

describe("toggleAllNotWorking", () => {
  it("ticks everyone not working and keeps the rest of the selection", () => {
    expect([...toggleAllNotWorking(crew, new Set(["b"]))].sort()).toEqual(["a", "b", "c"]);
  });
  it("clears them when they are all ticked already", () => {
    expect([...toggleAllNotWorking(crew, new Set(["a", "b", "c"]))]).toEqual(["b"]);
  });
  it("does nothing when everybody is working", () => {
    const all = [member("x", true)];
    expect(notWorkingIds(all)).toEqual([]);
    expect([...toggleAllNotWorking(all, new Set(["x"]))]).toEqual(["x"]);
  });
});

describe("chunk and summarize", () => {
  it("splits a big selection into batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 50)).toEqual([]);
  });
  it("counts who was done and who was not", () => {
    expect(summarize([{ ok: true }, { ok: false }, { ok: true }])).toEqual({ ok: 2, failed: 1 });
    expect(summarize([])).toEqual({ ok: 0, failed: 0 });
  });
});
