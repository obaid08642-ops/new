export type ProfileField = { key: string; value: string };
export type ProfileDomainState = "available" | "empty" | "forbidden" | "error";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function extractRecord(payload: unknown) {
  const root = asRecord(payload);
  return asRecord(root?.data) ?? root;
}

export function readProfileFields(record: Record<string, unknown> | null, acceptedKeys: string[]) {
  if (!record) return [] as ProfileField[];
  return acceptedKeys.flatMap((key) => {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return [{ key, value }];
    if (typeof value === "number" || typeof value === "boolean") return [{ key, value: String(value) }];
    return [];
  });
}

export function profileDomainState(status: number, fieldCount: number): ProfileDomainState {
  if (status === 403 || status === 404) return "forbidden";
  if (status < 200 || status >= 300) return "error";
  return fieldCount > 0 ? "available" : "empty";
}
