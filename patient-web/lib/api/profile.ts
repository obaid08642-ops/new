export type ProfileField = { key: string; value: string | number | boolean };
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
  const fields: ProfileField[] = [];
  for (const key of acceptedKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) fields.push({ key, value });
    if (typeof value === "number" || typeof value === "boolean") fields.push({ key, value });
  }
  return fields;
}

export function profileDomainState(status: number, fieldCount: number): ProfileDomainState {
  if (status === 403 || status === 404) return "forbidden";
  if (status < 200 || status >= 300) return "error";
  return fieldCount > 0 ? "available" : "empty";
}
