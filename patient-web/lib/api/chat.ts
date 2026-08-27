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

export type ChatMessageSummary = { id: string; senderRole: string; type: string; createdAt?: string; edited: boolean; deleted: boolean; hasAttachment: boolean };
export function extractChatMessageSummaries(payload: unknown): ChatMessageSummary[] {
  const root = asRecord(payload);
  const list = Array.isArray(root?.messages) ? root.messages : listFrom(payload);
  return list.flatMap((value) => {
    const record = asRecord(value);
    const id = threadIdSchema.safeParse(record?.id);
    if (!id.success || typeof record?.sender_role !== "string" || typeof record?.type !== "string") return [];
    return [{ id: id.data, senderRole: record.sender_role.slice(0, 40), type: record.type.slice(0, 20), createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined, edited: record.is_edited === true, deleted: record.is_deleted === true, hasAttachment: typeof record.attachment_url === "string" || typeof record.attachment_name === "string" }];
  });
}
