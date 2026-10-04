// R11 §5 lead 9 / PRODUCT.md "Privacy" / REVIEW_P13 13.R4: before acceptance a
// provider sees only the neighbourhood, never the exact address or phone.
import 'reflect-metadata';
import { lastValueFrom, of } from 'rxjs';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { ProviderPrivacyInterceptor } from './provider-privacy';
import { LabsController } from '../modules/labs/labs.controller';
import { RadiologyController } from '../modules/radiology/radiology.controller';
import { HomeCareCompatController } from '../modules/home-care/home-care-compat.module';

const booking = (state: string) => ({
  id: 'b1', patient_id: 'pat-1', state, patient_name: 'Patient', patient_phone: '+966500000001',
  address: { address: '12 Exact Street, Building 4', lat: 24.71, lng: 46.67, district: 'Al Olaya', city: 'Riyadh' },
});

async function run(user: Record<string, unknown>, body: unknown) {
  const ctx = { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as never;
  return lastValueFrom(new ProviderPrivacyInterceptor().intercept(ctx, { handle: () => of(body) }));
}

describe('provider privacy before acceptance (R11 §5 lead 9)', () => {
  it('a lab sees only the district of a new request', async () => {
    const [row] = (await run({ id: 'lab-1', role: 'lab' }, [booking('NEW_REQUEST')])) as Record<string, any>[];
    expect(row.patient_phone).toBeUndefined();
    expect(row.address).toEqual({ district: 'Al Olaya', city: 'Riyadh' });
    expect(row.patient_name).toBe('Patient');
  });

  it('after acceptance the provider gets the address and phone', async () => {
    const row = (await run({ id: 'lab-1', role: 'lab' }, booking('CONFIRMED'))) as Record<string, any>;
    expect(row.patient_phone).toBe('+966500000001');
    expect(row.address.address).toBe('12 Exact Street, Building 4');
  });

  it('the patient and an admin always see everything', async () => {
    expect(((await run({ id: 'pat-1', role: 'patient' }, booking('NEW_REQUEST'))) as any).patient_phone).toBe('+966500000001');
    expect(((await run({ id: 'adm', role: 'admin' }, booking('NEW_REQUEST'))) as any).patient_phone).toBe('+966500000001');
  });

  it('masks inside { data: [...] } and mongoose documents', async () => {
    const doc = { toObject: () => booking('PENDING_INSURANCE') };
    const out = (await run({ id: 'n1', role: 'nurse' }, { data: [doc] })) as any;
    expect(out.data[0].patient_phone).toBeUndefined();
    expect(out.data[0].address.lat).toBeUndefined();
  });

  it('is applied to the lab, radiology and home-care controllers', () => {
    for (const c of [LabsController, RadiologyController, HomeCareCompatController]) {
      expect(Reflect.getMetadata(INTERCEPTORS_METADATA, c) || []).toContain(ProviderPrivacyInterceptor);
    }
  });
});
