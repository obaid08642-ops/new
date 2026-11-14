import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * PT-03: a dependant is a person with no account of their own whom a guardian manages: a minor (the Patient Terms require users to be
 * 18 or over, and the Privacy Policy says a minor's data is managed from the guardian's account). It is a `family_members` record owned
 * by the guardian: bookings and orders name it with `family_member_id` (common/family-member.ts) and the guardian books and pays.
 */
export const ADULT_AGE = 18;
export const MAX_DEPENDANTS = 20;
export const DEPENDANT_RELATIONS = ['child', 'sibling', 'grandchild', 'spouse', 'parent', 'grandparent', 'other'] as const;

export interface DependantInput { name?: unknown; birth_date?: unknown; relation_code?: unknown; gender?: unknown; guardian_consent?: unknown }

/** Whole years between the birth date and `now` (the birthday counts on the day). */
export function ageYears(birth: Date, now: Date): number {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function isMinor(birth: Date | string | undefined | null, now: Date = new Date()): boolean {
  if (!birth) return false;
  const d = new Date(birth);
  return !isNaN(d.getTime()) && ageYears(d, now) < ADULT_AGE;
}

/** The stored record for a new dependant, or a 400. The guardian's consent is required and stored with its time and author. */
export function buildDependant(guardianId: string, input: DependantInput, now: Date = new Date()) {
  if (input.guardian_consent !== true) throw new BadRequestException('guardian_consent_required');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 80) throw new BadRequestException('dependant_name_invalid');
  if (typeof input.birth_date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(input.birth_date)) throw new BadRequestException('birth_date_invalid');
  const birth = new Date(input.birth_date.slice(0, 10) + 'T00:00:00.000Z');
  if (isNaN(birth.getTime()) || birth.getTime() > now.getTime() || ageYears(birth, now) > 120) throw new BadRequestException('birth_date_invalid');
  if (typeof input.relation_code !== 'string' || !(DEPENDANT_RELATIONS as readonly string[]).includes(input.relation_code)) throw new BadRequestException('relation_invalid');
  if (input.gender !== undefined && input.gender !== null && input.gender !== 'male' && input.gender !== 'female') throw new BadRequestException('gender_invalid');
  return {
    id: uuidv4(),
    // owner_id: the guardian; user_id: the same id, which the instant-consultation check and the ordering check also read
    owner_id: guardianId,
    user_id: guardianId,
    name,
    birth_date: birth,
    gender: input.gender ?? null,
    relation: input.relation_code,
    relation_code: input.relation_code,
    is_minor: ageYears(birth, now) < ADULT_AGE,
    guardian_consent: { given: true, at: now, by: guardianId },
    createdAt: now,
    updatedAt: now,
  };
}

/** What the guardian sees; `is_minor` is recomputed at read time so a child who turns 18 stops being listed as a minor. */
export function shapeDependant(d: any, now: Date = new Date()) {
  return {
    id: d.id,
    name: d.name,
    birth_date: d.birth_date ?? null,
    gender: d.gender ?? null,
    relation_code: d.relation_code ?? d.relation ?? null,
    is_minor: isMinor(d.birth_date, now),
    guardian_consent_at: d.guardian_consent?.at ?? null,
    has_insurance: !!d.insurance,
  };
}
