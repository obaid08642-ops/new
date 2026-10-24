/**
 * Owner-approved doctor profile and registration fields (2026-10-24): education, follow-up price and window, procedures
 * with prices, gender, the clinic address with its map point, the SCFHS licence expiry. Everything here is a pure rule so
 * the registration steps, the submit check and the tests share it. All additions are optional on stored profiles
 * (expand-only): a doctor registered before this keeps working, and is asked for the new required fields at their next submit.
 */
import { BadRequestException } from '@nestjs/common';
import { ACADEMIC_DEGREES_LIST } from '../../common/enums';

export interface DoctorEducation { university: string; graduation_year: number | null; fellowship_board: string | null }
export interface DoctorProcedure { name_ar: string; name_en: string | null; price: number }

const bad = (code: string) => new BadRequestException(code);
const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, max) : null);

export function normalizeGender(v: unknown): 'male' | 'female' | 'any' | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (['male', 'm', 'ذكر'].includes(s)) return 'male';
  if (['female', 'f', 'أنثى', 'انثى'].includes(s)) return 'female';
  if (s === 'any') return 'any';
  return null;
}

export function normalizeEducation(value: unknown, now = new Date()): DoctorEducation[] {
  if (!Array.isArray(value)) throw bad('invalid_education');
  if (value.length > 10) throw bad('too_many_education_entries');
  return value.map((e: any) => {
    const university = text(e?.university, 200);
    if (!university) throw bad('education_university_required');
    const year = e?.graduation_year;
    if (year !== undefined && year !== null && !(Number.isInteger(year) && year >= 1950 && year <= now.getFullYear())) throw bad('invalid_graduation_year');
    return { university, graduation_year: year ?? null, fellowship_board: text(e?.fellowship_board, 200) };
  });
}

export function normalizeProcedures(value: unknown): DoctorProcedure[] {
  if (!Array.isArray(value)) throw bad('invalid_procedures');
  if (value.length > 50) throw bad('too_many_procedures');
  return value.map((p: any) => {
    const name_ar = text(p?.name_ar, 200);
    if (!name_ar) throw bad('procedure_name_required');
    const price = p?.price;
    if (!(typeof price === 'number' && Number.isFinite(price) && price >= 0 && price <= 1_000_000)) throw bad('invalid_procedure_price');
    return { name_ar, name_en: text(p?.name_en, 200), price };
  });
}

export function assertFollowUp(price: unknown, windowDays: unknown): void {
  if (price !== undefined && !(typeof price === 'number' && Number.isFinite(price) && price >= 0 && price <= 1_000_000)) throw bad('invalid_follow_up_price');
  if (windowDays !== undefined && !(Number.isInteger(windowDays) && (windowDays as number) >= 1 && (windowDays as number) <= 365)) throw bad('invalid_follow_up_window');
}

export function normalizeClinicLocation(v: any): { lat: number; lng: number } {
  const lat = v?.lat, lng = v?.lng;
  if (!(typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) || (lat === 0 && lng === 0)) throw bad('invalid_clinic_location');
  return { lat, lng };
}

/** SA IBAN: SA + 22 digits (spaces tolerated). */
export function normalizeIban(v: unknown): string | null {
  const s = String(v ?? '').replace(/\s+/g, '').toUpperCase();
  return /^SA\d{22}$/.test(s) ? s : null;
}

/** What a doctor must have before registration can be submitted (owner decision 2026-10-24). Returns the missing codes. */
export function doctorSubmitProblems(p: any, now = new Date()): string[] {
  const out: string[] = [];
  if (!ACADEMIC_DEGREES_LIST.includes(p?.academic_degree)) out.push('academic_degree_required');
  if (!Array.isArray(p?.sub_specialties) || !p.sub_specialties.some((s: unknown) => typeof s === 'string' && s.trim())) out.push('sub_specialty_required');
  const expiry = p?.license_expiry_date ? new Date(p.license_expiry_date) : null;
  if (!expiry || Number.isNaN(expiry.getTime())) out.push('license_expiry_date_required');
  else if (expiry.getTime() < now.getTime()) out.push('license_already_expired');
  if (!normalizeIban(p?.iban)) out.push('valid_iban_required');
  return out;
}
