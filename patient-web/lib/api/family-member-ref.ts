import { createHash } from "node:crypto";

/** Opaque route reference: the raw account identifier must not appear in HTML URLs. */
export function familyMemberRef(memberId: string) {
  return createHash("sha256").update(`nabd-family-member:${memberId}`).digest("hex").slice(0, 32);
}
