import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { keys } from "../../lib/api";
import type { PunchDto, TodayOverview } from "../../lib/api-types";
import { getSocket } from "./realtime-socket";
import { useSession } from "./session";

/** Same contract as the web (pugbuild-web/src/lib/realtime/events.ts). */
const EVENTS = ["punch.clock_in", "punch.clock_out", "punch.annotated", "review.changed", "payment.changed", "site.changed", "task.changed", "site.post"] as const;

/**
 * Keeps the screens fresh without polling: every company event invalidates the queries it touches,
 * and the person joins the presence channel so the office sees them online. Without a key it is a no-op.
 */
export function RealtimeSync() {
  const { me } = useSession();
  const qc = useQueryClient();
  const companyId = me?.company.id;
  const membershipId = me?.member.id;
  const office = !!me && me.member.role !== "worker";

  useEffect(() => {
    if (!companyId) return;
    const pusher = getSocket();
    if (!pusher) return;
    const invalidate = (prefixes: readonly (readonly string[])[]) => {
      for (const key of prefixes) qc.invalidateQueries({ queryKey: key });
    };
    const channel = pusher.subscribe(`private-company-${companyId}`);
    const presence = pusher.subscribe(`presence-company-${companyId}`);
    const handlers: Record<(typeof EVENTS)[number], (payload: Record<string, unknown>) => void> = {
      "punch.clock_in": (p) => invalidate(p.membershipId === membershipId ? [keys.openPunch, ["week"], keys.officeToday] : [keys.officeToday, ["office", "week"]]),
      "punch.clock_out": (p) => invalidate(p.membershipId === membershipId ? [keys.openPunch, ["week"], keys.officeToday] : [keys.officeToday, ["office", "week"]]),
      "punch.annotated": () => invalidate([keys.officeToday]),
      "review.changed": () => invalidate([keys.officeToday, ["office", "week"]]),
      "payment.changed": () => invalidate([keys.payments, ["office", "week"]]),
      "site.changed": () => invalidate([keys.sites, keys.officeToday]),
      "task.changed": () => invalidate([keys.tasks, ["site"]]),
      "site.post": (p) => invalidate([["site", String(p.siteId)]]),
    };
    for (const name of EVENTS) channel.bind(name, handlers[name]);

    // Office roles also hear the crew's live positions. The server refuses this channel to
    // workers. A report moves the dot in the cached overview; no refetch, no re-render storm.
    const officeChannel = office ? pusher.subscribe(`private-office-${companyId}`) : null;
    const onLocation = (p: { punchId: string; membershipId: string; location: { lat: number; lng: number; accuracy?: number }; siteId?: string; at: string }) => {
      qc.setQueryData<TodayOverview>(keys.officeToday, (prev) => {
        if (!prev) return prev;
        const punches: PunchDto[] = prev.punches.map((x) =>
          x.id === p.punchId ? { ...x, live: { at: p.at, location: p.location, siteId: p.siteId } } : x,
        );
        return { ...prev, punches };
      });
    };
    officeChannel?.bind("worker.location", onLocation);

    // Back from the background after a while: the socket may have dropped events, so refetch the
    // screens on display once. Short trips (permission dialog, photo picker) do not count.
    let hiddenAt = 0;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") hiddenAt = Date.now();
      if (state === "active") {
        pusher.connect();
        if (hiddenAt && Date.now() - hiddenAt > 30_000) qc.invalidateQueries({ refetchType: "active" });
        hiddenAt = 0;
      }
    });
    return () => {
      sub.remove();
      for (const name of EVENTS) channel.unbind(name, handlers[name]);
      if (officeChannel) {
        officeChannel.unbind("worker.location", onLocation);
        pusher.unsubscribe(officeChannel.name);
      }
      pusher.unsubscribe(channel.name);
      pusher.unsubscribe(presence.name);
    };
  }, [companyId, membershipId, office, qc]);

  return null;
}
