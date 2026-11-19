import { useQuery } from "@tanstack/react-query";
import { api, keys } from "../../lib/api";
import { todayKeyIn } from "../../lib/format";
import { addDaysKey } from "../../lib/schedule";
import { useMe } from "../session/session";

/** How far ahead the phone looks: enough for "Next days" and a week of clock-in reminders. */
const DAYS_AHEAD = 13;

/**
 * The person's scheduled days from today on (company timezone). One query for the "Next days"
 * card and the clock-in reminders; a server without the schedule simply yields no entries.
 */
export function useMySchedule() {
  const me = useMe();
  const todayKey = todayKeyIn(me.company.settings.timezone);
  const query = useQuery({
    queryKey: [...keys.schedule, todayKey],
    queryFn: () => api.schedule(todayKey, addDaysKey(todayKey, DAYS_AHEAD)),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return { todayKey, entries: query.data?.entries, settled: !query.isPending || query.fetchStatus === "paused" };
}
