import type Pusher from "pusher-js";
import { getApiUrl } from "../../lib/api";

const KEY = process.env.EXPO_PUBLIC_PUSHER_KEY;
const CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "us2";

// The React Native bundle exposes the class as a named export (`module.exports.Pusher`), not as the default.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PusherRN = (require("pusher-js/react-native") as { Pusher: typeof Pusher }).Pusher;

let socket: Pusher | null = null;
let socketServer: string | null = null;

/** One socket per server: a server switch (dev builds) rebuilds it with the right auth endpoint. */
export function getSocket(): Pusher | null {
  if (!KEY) return null;
  const server = getApiUrl();
  if (socket && socketServer !== server) disconnectRealtime();
  if (!socket) {
    socket = new PusherRN(KEY, {
      cluster: CLUSTER,
      // The session cookie travels with the XHR, so the web's auth route accepts the app as-is.
      channelAuthorization: { endpoint: `${server}/api/realtime/auth`, transport: "ajax" },
    });
    socketServer = server;
  }
  return socket;
}

/** Called on sign-out: no socket keeps listening for a company the person left. */
export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
  socketServer = null;
}
