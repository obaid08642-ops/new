// Q103: shipping code carried demo identities and invented records behind
// env flags (SEED_DEMO_DATA, ALLOW_TEST_SEED): invented doctors, patients,
// pharmacies, couriers and providers, sample pharmacy orders, and real
// hospitals with stock photos, made-up insurer lists and 24/7 hours. Owner
// decision 2026-10-04: remove demo data completely. Reference data the
// platform needs (lab catalog, broadcast stages, COD policy) stays.
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import 'reflect-metadata';
import { ProviderDashboardController } from '../modules/provider/provider.controllers';
import { AdminPharmacyController } from '../modules/pharmacy/pharmacy.controllers';

const SRC = join(__dirname, '..');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(n) && !/\.spec\.ts$/.test(n) ? [p] : [];
  });
}

describe('no demo seed data in backend/src (Q103)', () => {
  it('the demo seed files are gone', () => {
    for (const f of [
      'modules/seed/seed.data.ts', 'modules/seed/seed.facilities.ts',
      'modules/provider/services/provider-seed.service.ts', 'modules/pharmacy/services/pharmacy-seed.service.ts',
    ]) expect(existsSync(join(SRC, f))).toBe(false);
    expect(existsSync(join(SRC, '..', 'scripts', 'seed_test_providers.js'))).toBe(false);
  });

  it('no source file seeds demo identities or reads a demo-seed flag', () => {
    const banned = /SEED_DEMO_DATA|ALLOW_TEST_SEED|SEED_DOCTORS|SEED_PHARMACIES|SEED_USERS|seedDemoProviders|seedDemoDoctors|PharmacySeedService|ProviderSeedService|seedSampleOrder/;
    const offenders = files(SRC).filter((f) => banned.test(readFileSync(f, 'utf8'))).map((f) => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it('the seed routes no longer exist (POST /provider/seed, /provider/seed/reset, /admin/pharmacy/seed)', () => {
    const paths = (C: Function) => Object.getOwnPropertyNames(C.prototype)
      .map((n) => Object.getOwnPropertyDescriptor(C.prototype, n)?.value)
      .filter((h) => typeof h === 'function')
      .map((h) => Reflect.getMetadata('path', h));
    expect(paths(ProviderDashboardController)).not.toEqual(expect.arrayContaining(['seed']));
    expect(paths(ProviderDashboardController)).not.toContain('seed/reset');
    expect(paths(AdminPharmacyController)).not.toContain('seed');
  });
});
