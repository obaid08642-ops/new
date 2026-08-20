const allowedVitalKeys = ["heart_rate", "glucose", "bp", "weight", "temperature", "spo2"] as const;
type VitalKey = typeof allowedVitalKeys[number];

export type VitalSummaryItem = { key: VitalKey; value: string; unit?: string; measuredAt?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results, root?.vitals]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function vitalFrom(value: unknown): VitalSummaryItem | null {
  const record = asRecord(value);
  const key = record?.key;
  const rawValue = record?.value;
  if (!record || !allowedVitalKeys.includes(key as VitalKey) || typeof rawValue !== "string" || !rawValue.trim()) return null;
  const unit = typeof record.unit === "string" && record.unit.trim() ? record.unit : undefined;
  const measuredAt = typeof record.measured_at === "string" && record.measured_at.trim() ? record.measured_at : undefined;
  return { key: key as VitalKey, value: rawValue, unit, measuredAt };
}

export function extractVitalSummary(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const vital = vitalFrom(item);
    return vital ? [vital] : [];
  });
}
