/**
 * PT-03: a dependant is a person with no account (a minor) whom the guardian adds and manages: POST/GET/DELETE
 * /family/dependants (backend family.controller). The guardian's consent is required by the server and stored with its time.
 */
export const DEPENDANT_RELATIONS = ["child", "sibling", "parent", "spouse", "other"] as const;
export type DependantRelation = (typeof DEPENDANT_RELATIONS)[number];

export type DependantForm = { name: string; birthDate: string; relation: DependantRelation | ""; consent: boolean };

export type DependantBody = { name: string; birth_date: string; relation_code: DependantRelation; guardian_consent: true };

/** The request body, or null while the form is not complete: a name, a past date as YYYY-MM-DD, a relation and the guardian's consent. */
export function dependantBody(form: DependantForm, now: Date = new Date()): DependantBody | null {
  const name = form.name.trim();
  if (!name || name.length > 80 || !form.consent || !form.relation) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) return null;
  const birth = new Date(`${form.birthDate}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== form.birthDate || birth.getTime() > now.getTime()) return null;
  return { name, birth_date: form.birthDate, relation_code: form.relation, guardian_consent: true };
}

export type DependantRow = { id: string; name: string; relation: string };

/** The guardian's dependants from GET /family/dependants (an array, or `{ data: [...] }`); rows without an id and a name are dropped. */
export function readDependants(payload: unknown): DependantRow[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? (root?.data as unknown[]) : [];
  return list.flatMap((entry) => {
    const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
    const id = typeof row?.id === "string" ? row.id : "";
    const name = typeof row?.name === "string" ? row.name.trim() : "";
    if (!id || !name) return [];
    const relation = typeof row?.relation_code === "string" ? row.relation_code : typeof row?.relation === "string" ? row.relation : "";
    return [{ id, name, relation }];
  });
}
