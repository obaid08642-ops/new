import { z } from "zod";

const notificationIdSchema = z.string().uuid();

export type PatientNotification = { id: string; title?: string; body?: string; priority?: string; createdAt?: string; read?: boolean };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results, root?.notifications]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function text(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function notificationFrom(value: unknown): PatientNotification | null {
  const record = asRecord(value);
  const id = notificationIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  return {
    id: id.data,
    title: text(record, "title"),
    body: text(record, "body"),
    priority: text(record, "priority"),
    createdAt: text(record, "createdAt"),
    read: typeof record.read === "boolean" ? record.read : undefined,
  };
}

export function extractPatientNotifications(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const notification = notificationFrom(item);
    return notification ? [notification] : [];
  });
}
