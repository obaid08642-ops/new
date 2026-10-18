import { ServiceState } from '../../common/enums';

/** The universal states in which no provider has accepted the job yet. */
const BEFORE_ACCEPTANCE: ReadonlySet<string> = new Set([ServiceState.REQUESTED, ServiceState.MATCHING]);

export interface ProviderJobPrivacyFields {
  universal_state: string;
  address: unknown;
  contact: unknown;
  patient_phone: unknown;
}

/**
 * 13.R4: before a provider accepts a job, the patient's exact address, contact and phone are withheld, and the
 * provider sees the district (or the city) only, as `approx_area`. From acceptance on the full record is shown.
 */
export function withholdBeforeAcceptance<T extends ProviderJobPrivacyFields>(job: T): T & { approx_area: string | null } {
  if (!BEFORE_ACCEPTANCE.has(job.universal_state)) return { ...job, approx_area: null };
  const address = job.address && typeof job.address === 'object' ? (job.address as Record<string, unknown>) : null;
  const district = typeof address?.district === 'string' && address.district.trim() ? address.district : null;
  const city = typeof address?.city === 'string' && address.city.trim() ? address.city : null;
  return { ...job, address: null, contact: null, patient_phone: null, approx_area: district ?? city };
}
