import { createOfflineQueue, isNetworkError, isPermanentRejection, type QueueStorage } from "../lib/offline-queue";

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

function memoryStorage(): QueueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => void map.set(k, v),
    removeItem: async (k) => void map.delete(k),
  };
}

describe("offline queue", () => {
  it("keeps one pending punch per kind and replays in order", async () => {
    const q = createOfflineQueue(memoryStorage());
    await q.enqueue({ kind: "clock-in", clientId: "a", deviceAt: "2026-10-21T11:00:00Z" });
    await q.enqueue({ kind: "clock-in", clientId: "dup", deviceAt: "2026-10-21T11:01:00Z" });
    await q.enqueue({ kind: "clock-out", clientId: "b", deviceAt: "2026-10-21T20:00:00Z" });
    expect(await q.size()).toBe(2);
    const sent: string[] = [];
    const n = await q.replay(async (i) => void sent.push(i.clientId));
    expect(n).toEqual({ sent: 2, dropped: 0 });
    expect(sent).toEqual(["a", "b"]);
    expect(await q.size()).toBe(0);
  });

  it("stops at the first network failure and keeps the rest", async () => {
    const q = createOfflineQueue(memoryStorage());
    await q.enqueue({ kind: "clock-in", clientId: "a", deviceAt: "x" });
    await q.enqueue({ kind: "clock-out", clientId: "b", deviceAt: "y" });
    const n = await q.replay(async () => {
      throw new Error("Network request failed");
    });
    expect(n).toEqual({ sent: 0, dropped: 0 });
    expect(await q.size()).toBe(2);
  });

  it("drops a punch the server definitely rejected, and says it was not sent", async () => {
    const q = createOfflineQueue(memoryStorage());
    await q.enqueue({ kind: "clock-in", clientId: "a", deviceAt: "x" });
    const n = await q.replay(async () => {
      throw httpError(409);
    });
    expect(n).toEqual({ sent: 0, dropped: 1 });
    expect(await q.size()).toBe(0);
  });

  it("keeps punches on an expired session, rate limit or server error", async () => {
    for (const status of [401, 429, 500, 502]) {
      const q = createOfflineQueue(memoryStorage());
      await q.enqueue({ kind: "clock-in", clientId: "a", deviceAt: "x" });
      await q.replay(async () => {
        throw httpError(status);
      });
      expect(await q.size()).toBe(1);
    }
    expect(isPermanentRejection(httpError(423))).toBe(true);
    expect(isPermanentRejection(new Error("boom"))).toBe(false);
  });

  it("only replays the signed-in person's punches", async () => {
    const q = createOfflineQueue(memoryStorage());
    await q.enqueue({ kind: "clock-in", clientId: "mine", deviceAt: "x", ownerId: "m1" });
    await q.enqueue({ kind: "clock-in", clientId: "theirs", deviceAt: "x", ownerId: "m2" });
    const sent: string[] = [];
    await q.replay(async (i) => void sent.push(i.clientId), "m1");
    expect(sent).toEqual(["mine"]);
    expect(await q.size("m2")).toBe(1);
  });

  it("tells subscribers when the queue changes", async () => {
    const q = createOfflineQueue(memoryStorage());
    let calls = 0;
    const off = q.subscribe(() => (calls += 1));
    await q.enqueue({ kind: "clock-in", clientId: "a", deviceAt: "x" });
    off();
    await q.clear();
    expect(calls).toBe(1);
  });

  it("recognizes network errors", () => {
    expect(isNetworkError(new Error("Network request failed"))).toBe(true);
    expect(isNetworkError(new Error("conflict"))).toBe(false);
  });
});
