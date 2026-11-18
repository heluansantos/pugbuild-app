import type { PunchHistoryEntry, PunchHistoryState } from "./api-types";

/** The "Edited" marker: someone corrected the times, or the office closed the shift by hand. */
export function isPunchEdited(punch: { flags: readonly string[] }): boolean {
  return punch.flags.includes("edited");
}

export type HistoryField = keyof PunchHistoryState;

export interface HistoryLine {
  field: HistoryField;
  /** An edit shows old → new; every other action has a single value. */
  change: boolean;
  before?: string;
  after?: string;
}

const FIELDS: HistoryField[] = ["clockIn", "clockOut", "siteName"];

/** The value lines under one history entry, in a fixed order. */
export function historyLines(entry: Pick<PunchHistoryEntry, "action" | "before" | "after">): HistoryLine[] {
  const lines: HistoryLine[] = [];
  for (const field of FIELDS) {
    const before = entry.before?.[field];
    const after = entry.after?.[field];
    if (!before && !after) continue;
    if (entry.action === "edit") lines.push({ field, change: true, before, after });
    else lines.push({ field, change: false, after: after ?? before });
  }
  return lines;
}
