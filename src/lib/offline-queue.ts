import type { GeoPoint } from "./api-types";

/** Punches tapped without signal. Replayed in order once the phone is back online. */
export interface QueuedPunch {
  id: string;
  kind: "clock-in" | "clock-out";
  /** Idempotency key sent to the server so a replay never doubles a punch. */
  clientId: string;
  deviceAt: string;
  /** Membership that tapped it: never replayed under another account or company. */
  ownerId?: string;
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

/** HTTP statuses that mean "the server looked at it and said no": retrying will never help. */
const PERMANENT = new Set([400, 404, 409, 422, 423]);

export function newClientId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

/** True only for a definite rejection. 401 (session expired offline), 429, 5xx and unknowns retry. */
export function isPermanentRejection(error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: unknown }).status : undefined;
  return typeof status === "number" && PERMANENT.has(status);
}

export interface ReplayResult {
  sent: number;
  dropped: number;
}

export function createOfflineQueue(storage: QueueStorage) {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

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
    notify();
  }
  const mine = (i: QueuedPunch, ownerId?: string) => !ownerId || !i.ownerId || i.ownerId === ownerId;

  return {
    list,
    /** Called after every change, so screens update the moment a punch is queued or sent. */
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async size(ownerId?: string) {
      return (await list()).filter((i) => mine(i, ownerId)).length;
    },
    /** One pending item per kind and person: tapping twice offline keeps the first tap. */
    async enqueue(item: Omit<QueuedPunch, "id">): Promise<QueuedPunch> {
      const items = await list();
      const existing = items.find((i) => i.kind === item.kind && mine(i, item.ownerId));
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
     * Sends this person's queued punches in order and stops at the first failure that may be
     * temporary, so a clock-out never lands before its clock-in and nothing is lost. Only a
     * definite server rejection removes an item without sending it.
     */
    async replay(send: (item: QueuedPunch) => Promise<void>, ownerId?: string): Promise<ReplayResult> {
      const items = (await list()).filter((i) => mine(i, ownerId));
      const result: ReplayResult = { sent: 0, dropped: 0 };
      for (const item of items) {
        try {
          await send(item);
          result.sent += 1;
        } catch (e) {
          if (!isPermanentRejection(e)) break;
          result.dropped += 1;
        }
        await write((await list()).filter((i) => i.id !== item.id));
      }
      return result;
    },
  };
}

export function isNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /network request failed|fetch failed|Failed to fetch|NetworkError|Load failed|network|timeout|aborted/i.test(msg);
}
