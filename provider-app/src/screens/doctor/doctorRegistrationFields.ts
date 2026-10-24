// Pure helpers for the fields the backend requires from a doctor at submit (kept apart from the screen so they test without native modules).
/** 'Interventional, Pediatric' -> ['Interventional', 'Pediatric'] (the backend wants a list; at least one is required at submit) */
export function splitSubSpecialties(v: string): string[] {
  return String(v || '').split(/[,،]/).map((x) => x.trim()).filter(Boolean).slice(0, 10);
}

/** YYYY-MM-DD that is today or later (a lapsed SCFHS licence cannot register) */
export function isFutureLicenseDate(v: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return false;
  const d = new Date(`${v}T23:59:59`);
  return !Number.isNaN(d.getTime()) && d.getTime() >= now.getTime();
}
