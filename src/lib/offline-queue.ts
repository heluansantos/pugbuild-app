import type { GeoPoint } from "./api-types";

/** Punches tapped without signal. Replayed in order once the phone is back online. */
export interface QueuedPunch {
  id: string;
  kind: "clock-in" | "clock-out";
  /** Idempotency key sent to the server so a replay never doubles a punch. */
  clientId: string;
  deviceAt: string;
  location?: GeoPoint;
  comment?: string;
  notifyOffice?: boolean;
}

export interface QueueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const QUEUE_KEY = "pb.offline-queue.v1";

export function newClientId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

export function createOfflineQueue(storage: QueueStorage) {
  async function list(): Promise<QueuedPunch[]> {
    try {
      const raw = await storage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as QueuedPunch[]) : [];
    } catch {
      return [];
    }
  }
  async function write(items: QueuedPunch[]) {
    if (items.length === 0) await storage.removeItem(QUEUE_KEY);
    else await storage.setItem(QUEUE_KEY, JSON.stringify(items));
  }
  return {
    list,
    async size() {
      return (await list()).length;
    },
    /** One pending item per kind: tapping twice offline keeps the first tap. */
    async enqueue(item: Omit<QueuedPunch, "id">): Promise<QueuedPunch> {
      const items = await list();
      const existing = items.find((i) => i.kind === item.kind);
      if (existing) return existing;
      const full: QueuedPunch = { id: newClientId(), ...item };
      await write([...items, full]);
      return full;
    },
    async remove(id: string) {
      await write((await list()).filter((i) => i.id !== id));
    },
    async clear() {
      await write([]);
    },
    /**
     * Sends each queued punch in order. Stops at the first failure so a clock-out never lands
     * before its clock-in. Returns how many were sent.
     */
    async replay(send: (item: QueuedPunch) => Promise<void>): Promise<number> {
      const items = await list();
      let sent = 0;
      for (const item of items) {
        try {
          await send(item);
        } catch (e) {
          if (isNetworkError(e)) break;
          // A server rejection (e.g. already clocked in) must not block the queue forever.
        }
        await write((await list()).filter((i) => i.id !== item.id));
        sent += 1;
      }
      return sent;
    },
  };
}

export function isNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /network request failed|fetch failed|Failed to fetch|NetworkError|Load failed|network|timeout|aborted/i.test(
    msg,
  );
}
