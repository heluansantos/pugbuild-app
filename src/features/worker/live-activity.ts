import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import type { PunchDto } from "../../lib/api-types";
import { formatTime } from "../../lib/format";
import { t } from "../../lib/i18n";
import { useLocale, useMe } from "../session/session";
import { useLiveActivityPref } from "./live-activity-pref";

/** Tapping the Lock Screen banner or the Dynamic Island opens the app on the clock tab. */
const ACTIVITY_URL = "pugbuild://";

type ShiftActivityProps = import("../../widgets/shift-activity").ShiftActivityProps;

async function loadActivity() {
  // Lazy: the widget module needs the native expo-widgets module, which only exists on iOS builds.
  return (await import("../../widgets/shift-activity")).default;
}

const SETTLE_DELAYS_MS = [0, 400, 1200, 2500];

/**
 * ActivityKit lists an app's activities asynchronously after a cold launch: for the first moments
 * `getInstances()` can come back empty although a banner is still on the Lock Screen. Acting on
 * that would start a duplicate, or leave the old one running after a clock-out. So the first
 * look at the list waits for it to settle: retry a few times while it is empty, once per launch.
 */
let settled = false;
async function listInstances(activity: Awaited<ReturnType<typeof loadActivity>>) {
  for (const delay of SETTLE_DELAYS_MS) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const instances = activity.getInstances();
    if (instances.length > 0 || settled) {
      settled = true;
      return instances;
    }
  }
  settled = true;
  return activity.getInstances();
}

/**
 * Brings the running activities in line with `desired`: none when it is null, otherwise exactly
 * one (adopting an instance that survived an app restart, ending any extra).
 */
async function reconcile(desired: ShiftActivityProps | null) {
  const activity = await loadActivity();
  const instances = await listInstances(activity);
  if (!desired) {
    await Promise.all(instances.map((i) => i.end("immediate")));
    return;
  }
  const [first, ...extra] = instances;
  await Promise.all(extra.map((i) => i.end("immediate")));
  if (first) await first.update(desired);
  else activity.start(desired, ACTIVITY_URL);
}

/** Calls are chained so a quick start/end/start never interleaves native calls. */
let queue: Promise<void> = Promise.resolve();
function enqueue(desired: ShiftActivityProps | null) {
  queue = queue
    .then(() => reconcile(desired))
    .then(async () => {
      // Belt and braces for the end: a banner that showed up late still gets ended.
      if (desired === null) {
        await new Promise((r) => setTimeout(r, 1500));
        await reconcile(null);
      }
    })
    .catch((e: unknown) => console.warn("Live Activity", e));
  return queue;
}

/** Ends the Lock Screen timer right away, from the clock-out itself: never waits for a re-render. */
export function endShiftLiveActivity(): Promise<void> {
  if (Platform.OS !== "ios") return Promise.resolve();
  return enqueue(null);
}

/**
 * Mirrors the running shift on the Lock Screen and in the Dynamic Island (iOS only, opt-in).
 * The clock itself is a native timer, so this only talks to ActivityKit when something changes:
 * start, site name, hours worked earlier today, language, or the app coming back to the
 * foreground (a system-ended activity, after its 8 hour limit, is started again).
 * `known` is false while the open shift is still being looked up: acting on "no shift" then would
 * end a banner that is in fact still running and start a duplicate a moment later.
 * Unmounting ends the activity: the screen only exists while a shift is open.
 */
export function useShiftLiveActivity(punch: PunchDto | null, siteName: string | null, earlierMinutes: number, known = true): void {
  const me = useMe();
  const locale = useLocale();
  const { loaded, enabled } = useLiveActivityPref();
  const [foregroundTick, setForegroundTick] = useState(0);
  const supported = Platform.OS === "ios";

  const real = punch !== null && punch.status === "open" && !punch.id.startsWith("queued-");
  const clockInAt = real ? punch.clockIn.at : null;
  const timezone = me.company.settings.timezone;

  useEffect(() => {
    if (!supported) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setForegroundTick((n) => n + 1);
    });
    return () => sub.remove();
  }, [supported]);

  useEffect(() => {
    // Wait for the stored choice and for the shift lookup: ending on "not loaded yet" would flicker
    // an adopted activity.
    if (!supported || !loaded || !known) return;
    if (!enabled || clockInAt === null) {
      void enqueue(null);
      return;
    }
    const startedAtMs = new Date(clockInAt).getTime() - earlierMinutes * 60_000;
    void enqueue({
      startedAtMs,
      siteName: siteName ?? t("worker.liveActivity.noSite"),
      startedLabel: t("worker.liveActivity.startedAt", { time: formatTime(new Date(clockInAt), timezone, locale) }),
      brand: t("worker.liveActivity.brand"),
      hint: t("worker.liveActivity.hint"),
    });
  }, [supported, loaded, known, enabled, clockInAt, siteName, earlierMinutes, timezone, locale, foregroundTick]);

  const supportedRef = useRef(supported);
  useEffect(() => {
    supportedRef.current = supported;
  }, [supported]);
  useEffect(
    () => () => {
      if (supportedRef.current) void enqueue(null);
    },
    []
  );
}
