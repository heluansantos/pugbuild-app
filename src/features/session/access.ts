import type { MemberDto, StaffAccess } from "../../lib/api-types";
import { useMe } from "./session";

const NONE: StaffAccess = { finance: false, map: false };
const FULL: StaffAccess = { finance: true, map: true };

/** Workers never get finance or the map; staff default to full access when the server sends nothing. */
export function accessOf(member: Pick<MemberDto, "role" | "access">): StaffAccess {
  if (member.role === "worker") return NONE;
  return member.access ?? FULL;
}

/** What the signed-in person may see. Use `accessOf` where the session may still be empty. */
export function useAccess(): StaffAccess {
  return accessOf(useMe().member);
}
