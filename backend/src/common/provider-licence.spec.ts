import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { assertProviderLicenceCurrent, isLicenceLapsed, licenceDaysLeft, licenceLapseInstant } from './provider-licence';

describe('licence expiry rule A2: valid through the end of the expiry day in Riyadh time, then lapsed for every provider type', () => {
  const T = (iso: string) => Date.parse(iso);

  it('a date typed as a day (stored as midnight UTC) is valid through 23:59:59 Riyadh = 20:59:59Z, lapsed from 21:00:00Z', () => {
    const expiry = '2030-01-06T00:00:00.000Z';
    expect(licenceLapseInstant(expiry)?.toISOString()).toBe('2030-01-06T21:00:00.000Z');
    expect(isLicenceLapsed(expiry, T('2030-01-06T00:00:00Z'))).toBe(false);       // the old rule: expired from here (03:00 Riyadh)
    expect(isLicenceLapsed(expiry, T('2030-01-06T20:59:59Z'))).toBe(false);
    expect(isLicenceLapsed(expiry, T('2030-01-06T21:00:00Z'))).toBe(true);
    expect(isLicenceLapsed(new Date(expiry), T('2030-01-07T12:00:00Z'))).toBe(true);
  });

  it('a date with a time of day is read as that instant in the market calendar (21:30Z = 00:30 the next Riyadh day)', () => {
    expect(licenceLapseInstant('2030-01-06T12:00:00Z')?.toISOString()).toBe('2030-01-06T21:00:00.000Z');
    expect(licenceLapseInstant('2030-01-06T21:30:00Z')?.toISOString()).toBe('2030-01-07T21:00:00.000Z');
  });

  it('no date, an empty or an invalid date is never lapsed here; days left count whole days', () => {
    for (const v of [null, undefined, '', 'not a date']) { expect(isLicenceLapsed(v)).toBe(false); expect(licenceDaysLeft(v)).toBeNull(); }
    expect(licenceDaysLeft('2030-01-06T00:00:00Z', T('2030-01-05T21:00:00Z'))).toBe(1);   // the whole expiry day is left
    expect(licenceDaysLeft('2030-01-06T00:00:00Z', T('2030-01-06T21:00:00Z'))).toBe(0);   // lapsed
    expect(licenceDaysLeft('2030-01-06T00:00:00Z', T('2030-01-01T00:00:00Z'))).toBe(6);
  });

  const db = (profile: any) => ({ collection: (n: string) => { expect(n).toBe('provider_profiles'); return { findOne: async () => profile }; } });
  it('a new booking, order or offer is refused for a lapsed licence of ANY type, allowed otherwise or when nothing is known', async () => {
    const now = T('2030-01-06T21:00:00Z');
    for (const type of ['doctor', 'pharmacy', 'lab', 'radiology', 'nursing', 'hospital']) {
      await expect(assertProviderLicenceCurrent(db({ type, license_expiry_date: new Date('2030-01-06T00:00:00Z') }), 'acc', now)).rejects.toThrow(BadRequestException);
    }
    await expect(assertProviderLicenceCurrent(db({ license_expiry_date: new Date('2030-01-06T00:00:00Z') }), 'acc', now)).rejects.toThrow('provider_license_expired');
    await expect(assertProviderLicenceCurrent(db({ license_expiry_date: new Date('2030-01-06T00:00:00Z') }), 'acc', T('2030-01-06T20:00:00Z'))).resolves.toBeUndefined();
    await expect(assertProviderLicenceCurrent(db(null), 'acc', now)).resolves.toBeUndefined();
    await expect(assertProviderLicenceCurrent(db({}), 'acc', now)).resolves.toBeUndefined();
    await expect(assertProviderLicenceCurrent(null, 'acc', now)).resolves.toBeUndefined();
    await expect(assertProviderLicenceCurrent(db({ license_expiry_date: new Date('2000-01-01') }), '', now)).resolves.toBeUndefined();
  });

  it('every booking / offer entry point calls the check (a guard against a path that forgets it)', () => {
    const src = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');
    expect(src('modules/labs/labs.service.ts')).toContain('assertProviderLicenceCurrent(this.bkgModel.db, data.provider_account_id)');
    expect(src('modules/radiology/radiology.service.ts')).toContain('assertProviderLicenceCurrent(this.svcModel.db, providerId)');
    expect(src('modules/home-care/home-care.service.ts')).toContain('assertProviderLicenceCurrent(this.svcModel.db, providerId)');
    expect(src('modules/pharmacy/services/pharmacy-offer.service.ts').match(/assertProviderLicenceCurrent\(this\.connection\.db, user\.id\)/g)).toHaveLength(2);
    expect(src('modules/care/appointments.service.ts')).toContain('isLicenceLapsed((doctor as any).license_expiry_date)');
    expect(src('modules/legal/legal-enterprise.service.ts')).toContain('licenceDaysLeft(p.license_expiry_date, now)');
  });
});
