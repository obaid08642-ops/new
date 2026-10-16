/**
 * Issues 955 / 995: the emergency-controls page (kill switches + platform emergency maintenance).
 * Backend: GET/POST /kill-switches(/:key) and GET admin/governance/emergency-maintenance,
 * PUT admin/governance/trigger-emergency-maintenance (all modules.manage).
 */
export type KillSwitchRow = {
  key: string;
  name: string;
  description: string;
  danger: boolean;
  value: boolean;
  reason: string | null;
  updatedAt: string | null;
};

export type EmergencyState = { active: boolean; reason: string | null; updatedAt: string | null };

/** The minimum reason length the backend enforces (validateReason, MinLength(5)). */
export const MIN_REASON = 5;

/** The word the admin types to confirm (in-page confirmation, no browser dialogs). */
export const CONFIRM_WORD_ON = 'إيقاف';
export const CONFIRM_WORD_OFF = 'استعادة';

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** GET /kill-switches answers a list of { key, name, description, danger, value, reason, updated_at }. */
export function killSwitchRows(payload: unknown): KillSwitchRow[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && typeof (row as { key?: unknown }).key === 'string')
    .map((row) => ({
      key: String(row.key),
      name: text(row.name) ?? String(row.key),
      description: text(row.description) ?? '',
      danger: row.danger === true,
      value: row.value !== false,
      reason: text(row.reason),
      updatedAt: text(row.updated_at),
    }));
}

export function emergencyState(payload: unknown): EmergencyState {
  const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  return { active: p.active === true, reason: text(p.reason), updatedAt: text(p.updated_at) };
}

/** The typed confirmation must be exactly the word (surrounding spaces ignored). */
export function confirmationMatches(typed: string, word: string): boolean {
  return typed.trim() === word;
}

export function reasonValid(reason: string): boolean {
  return reason.trim().length >= MIN_REASON;
}
