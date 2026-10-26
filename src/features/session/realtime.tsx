import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import type Pusher from "pusher-js";
import { getApiUrl, keys } from "../../lib/api";
import { useSession } from "./session";

const KEY = process.env.EXPO_PUBLIC_PUSHER_KEY;
const CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "us2";

/** Same contract as the web (pugbuild-web/src/lib/realtime/events.ts). */
const EVENTS = ["punch.clock_in", "punch.clock_out", "punch.annotated", "review.changed", "payment.changed", "site.changed"] as const;

// The React Native bundle exposes the class as a named export (`module.exports.Pusher`), not as the default.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PusherRN = (require("pusher-js/react-native") as { Pusher: typeof Pusher }).Pusher;

let socket: Pusher | null = null;
function getSocket(): Pusher | null {
  if (!KEY) return null;
  socket ??= new PusherRN(KEY, {
    cluster: CLUSTER,
    // The session cookie travels with the XHR, so the web's auth route accepts the app as-is.
    channelAuthorization: { endpoint: `${getApiUrl()}/api/realtime/auth`, transport: "ajax" },
  });
  return socket;
}

/**
 * Keeps the screens fresh without polling: every company event invalidates the queries it touches,
 * and the person joins the presence channel so the office sees them online. Without a key it is a no-op.
 */
export function RealtimeSync() {
  const { me } = useSession();
  const qc = useQueryClient();
  const companyId = me?.company.id;
  const membershipId = me?.member.id;

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
    };
    for (const name of EVENTS) channel.bind(name, handlers[name]);

    // Coming back from the background: the socket may have been cut, so refetch once and reconnect.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        pusher.connect();
        qc.invalidateQueries();
      }
    });
    return () => {
      sub.remove();
      for (const name of EVENTS) channel.unbind(name, handlers[name]);
      pusher.unsubscribe(channel.name);
      pusher.unsubscribe(presence.name);
    };
  }, [companyId, membershipId, qc]);

  return null;
}
