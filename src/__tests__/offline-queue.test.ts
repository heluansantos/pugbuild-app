import { createOfflineQueue, isNetworkError, type QueueStorage } from "../lib/offline-queue";

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
    expect(n).toBe(2);
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
    expect(n).toBe(0);
    expect(await q.size()).toBe(2);
  });

  it("drops a punch the server rejected so the queue never jams", async () => {
    const q = createOfflineQueue(memoryStorage());
    await q.enqueue({ kind: "clock-in", clientId: "a", deviceAt: "x" });
    await q.replay(async () => {
      throw new Error("conflict");
    });
    expect(await q.size()).toBe(0);
  });

  it("recognizes network errors", () => {
    expect(isNetworkError(new Error("Network request failed"))).toBe(true);
    expect(isNetworkError(new Error("conflict"))).toBe(false);
  });
});
