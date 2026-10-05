/**
 * d0b9ce9 / R83: the clinic fields of the doctor registration step-3 request.
 * The "العنوان والعيادة" section collects the clinic name and the street address
 * of the clinic; Step3Dto (backend provider-onboarding.dto.ts) accepts them as
 * clinic_name / clinic_address, which /care/doctors/:id returns.
 */
export function doctorClinicFields(data: { clinicName?: string; address?: string }): { clinic_name?: string; clinic_address?: string } {
  const clinicName = (data.clinicName || '').trim();
  const clinicAddress = (data.address || '').trim();
  return {
    clinic_name: clinicName || undefined,
    clinic_address: clinicAddress || undefined,
  };
}
