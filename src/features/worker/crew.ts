import type { CrewMemberDto, MemberDto } from "../../lib/api-types";

/** Same limit as the server: a bigger selection goes out in more than one request. */
export const CREW_BATCH_MAX = 50;

/** Crew leads (a worker with the switch on) and office/admin see the Crew screen. */
export function canUseCrew(member: Pick<MemberDto, "role" | "crewLead">): boolean {
  return member.role !== "worker" || member.crewLead === true;
}

export interface CrewSelection {
  /** Ticked people with no shift running. */
  toStart: string[];
  /** Ticked people with a shift running. */
  toEnd: string[];
}

/** Splits the ticked people by what can be done for them; ids no longer in the list are dropped. */
export function splitSelection(members: readonly CrewMemberDto[], selected: ReadonlySet<string>): CrewSelection {
  const toStart: string[] = [];
  const toEnd: string[] = [];
  for (const m of members) {
    if (!selected.has(m.membershipId)) continue;
    (m.open ? toEnd : toStart).push(m.membershipId);
  }
  return { toStart, toEnd };
}

export function notWorkingIds(members: readonly CrewMemberDto[]): string[] {
  return members.filter((m) => !m.open).map((m) => m.membershipId);
}

/** "Select all not working" ticks them; when they are all ticked already it clears them. */
export function toggleAllNotWorking(members: readonly CrewMemberDto[], selected: ReadonlySet<string>): Set<string> {
  const ids = notWorkingIds(members);
  const next = new Set(selected);
  const allTicked = ids.length > 0 && ids.every((id) => next.has(id));
  for (const id of ids) {
    if (allTicked) next.delete(id);
    else next.add(id);
  }
  return next;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += Math.max(1, size)) out.push(items.slice(i, i + Math.max(1, size)));
  return out;
}

export function summarize(results: readonly { ok: boolean }[]): { ok: number; failed: number } {
  const ok = results.filter((r) => r.ok).length;
  return { ok, failed: results.length - ok };
}
