import { z } from "zod";

const memberIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export type FamilyMember = { id: string; role?: "owner" | "member"; joinedAt?: string; displayName?: string; relation?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results, root?.members]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function memberFrom(value: unknown): FamilyMember | null {
  const record = asRecord(value);
  const id = memberIdSchema.safeParse(record?.user_id);
  if (!id.success || !record) return null;
  const role = record.role === "owner" || record.role === "member" ? record.role : undefined;
  const joinedAt = typeof record.joined_at === "string" && record.joined_at.trim() ? record.joined_at : undefined;
  const displayName = [record.display_name, record.displayName].find((value) => typeof value === "string" && value.trim()) as string | undefined;
  const relation = typeof record.relation === "string" && record.relation.trim() ? record.relation : undefined;
  return { id: id.data, role, joinedAt, displayName, relation };
}

export function extractFamilyMembers(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const member = memberFrom(item);
    return member ? [member] : [];
  });
}
