import { BadRequestException } from '@nestjs/common';

/**
 * Gap 11 (reviewer decision 2026-11-02): the credential fields of a provider change only through review. `PATCH /provider/profile`
 * never writes them; it records a pending `provider_deltas` row with the old and the new values and the uploaded proof, and the admin
 * approves or rejects it on the deltas screen (the approved value is applied there, with an audit entry).
 */
export const CREDENTIAL_FIELDS = ['specialty', 'degree', 'medical_license_number', 'facility_license_number', 'license_expiry_date'] as const;
export type CredentialField = (typeof CREDENTIAL_FIELDS)[number];

/** Which uploaded document proves which field (the latest not-rejected one of the first type that exists is attached). */
export const PROOF_DOC_TYPES: Record<CredentialField, string[]> = {
  specialty: ['board_certificate', 'medical_license'],
  degree: ['academic_certificate'],
  medical_license_number: ['medical_license'],
  facility_license_number: ['facility_license'],
  license_expiry_date: ['medical_license', 'facility_license'],
};

export const MAX_CREDENTIAL_TEXT = 200;

export function splitCredentialPatch(patch: Record<string, unknown>): { credentials: Partial<Record<CredentialField, unknown>>; rest: Record<string, unknown> } {
  const credentials: Partial<Record<CredentialField, unknown>> = {};
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch ?? {})) {
    if ((CREDENTIAL_FIELDS as readonly string[]).includes(k)) { if (v !== undefined) credentials[k as CredentialField] = v; }
    else rest[k] = v;
  }
  return { credentials, rest };
}

const dayOf = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/** Validate one credential value; returns the stored form (text trimmed, expiry as an ISO day). */
export function normalizeCredential(field: CredentialField, value: unknown): string {
  if (field === 'license_expiry_date') {
    const day = dayOf(value);
    if (!day) throw new BadRequestException('license_expiry_date_invalid');
    return day;
  }
  const text = String(value ?? '').trim();
  if (!text || text.length > MAX_CREDENTIAL_TEXT) throw new BadRequestException(`${field}_invalid`);
  return text;
}

/** The comparable form of a stored value (so an unchanged field is not sent for review). */
export function comparable(field: CredentialField, value: unknown): string | null {
  if (field === 'license_expiry_date') return dayOf(value);
  return value == null ? null : String(value).trim();
}

/** Only the fields whose new value differs from the live one. */
export function changedCredentials(input: Partial<Record<CredentialField, unknown>>, live: Record<string, unknown> | null): { next: Record<string, string>; previous: Record<string, string | null> } {
  const next: Record<string, string> = {};
  const previous: Record<string, string | null> = {};
  for (const f of CREDENTIAL_FIELDS) {
    if (input[f] === undefined) continue;
    const value = normalizeCredential(f, input[f]);
    const before = comparable(f, live?.[f]);
    if (before === value) continue;
    next[f] = value;
    previous[f] = before;
  }
  return { next, previous };
}

/** Approval applies a day string as a Date (the profile stores the expiry as a date). */
export function applyCredentialTypes(changes: Record<string, unknown>): Record<string, unknown> {
  if (typeof changes.license_expiry_date === 'string') return { ...changes, license_expiry_date: new Date(`${changes.license_expiry_date}T00:00:00.000Z`) };
  return changes;
}
