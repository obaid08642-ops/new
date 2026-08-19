import { z } from "zod";

const threadIdSchema = z.string().uuid();
const allowedThreadTypes = ["direct", "group", "booking"] as const;

export type ChatThreadSummary = { id: string; type: typeof allowedThreadTypes[number]; lastActivityAt?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.threads, root?.data, root?.items, root?.results]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function threadFrom(value: unknown): ChatThreadSummary | null {
  const record = asRecord(value);
  const id = threadIdSchema.safeParse(record?.id);
  const type = record?.type;
  if (!id.success || !record || !allowedThreadTypes.includes(type as ChatThreadSummary["type"])) return null;
  const lastActivityAt = typeof record.last_message_at === "string" && record.last_message_at.trim() ? record.last_message_at : typeof record.updatedAt === "string" && record.updatedAt.trim() ? record.updatedAt : undefined;
  return { id: id.data, type: type as ChatThreadSummary["type"], lastActivityAt };
}

export function extractChatThreadSummaries(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const thread = threadFrom(item);
    return thread ? [thread] : [];
  });
}
