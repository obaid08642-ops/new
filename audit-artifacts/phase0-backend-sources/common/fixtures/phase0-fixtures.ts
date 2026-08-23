export const phase0Fixtures = Object.freeze({
  patients: Object.freeze({
    owner: Object.freeze({ id: 'patient-a', role: 'patient', email: 'patient-a@example.test' }),
    stranger: Object.freeze({ id: 'patient-b', role: 'patient', email: 'patient-b@example.test' }),
  }),
  providers: Object.freeze({
    primary: Object.freeze({ id: 'provider-a', role: 'provider', active: true, qualified: true }),
    stranger: Object.freeze({ id: 'provider-b', role: 'provider', active: true, qualified: true }),
  }),
  facilities: Object.freeze({
    pharmacy: Object.freeze({ id: 'pharmacy-a', kind: 'pharmacy', active: true }),
    lab: Object.freeze({ id: 'lab-a', kind: 'lab', active: true }),
    nursing: Object.freeze({ id: 'nurse-a', kind: 'nursing', active: true }),
  }),
  catalog: Object.freeze({
    medicine: Object.freeze({ id: 'medicine-a', requiresRx: false, priceMinor: 1250, currency: 'SAR' }),
    rxMedicine: Object.freeze({ id: 'medicine-rx-a', requiresRx: true, priceMinor: 2100, currency: 'SAR' }),
    labService: Object.freeze({ id: 'lab-service-a', active: true, priceMinor: 15000, currency: 'SAR' }),
    radiologyService: Object.freeze({ id: 'radiology-service-a', active: true, priceMinor: 35000, currency: 'SAR' }),
    homeCareService: Object.freeze({ id: 'home-care-service-a', active: true, priceMinor: 25000, currency: 'SAR' }),
  }),
  policy: Object.freeze({
    insurance: Object.freeze({ id: 'policy-a', patientId: 'patient-a', status: 'active', copayPercent: 20 }),
  }),
  fakePsp: Object.freeze({
    success: 'authorized',
    pending: 'pending',
    failure: 'failed',
  }),
});
