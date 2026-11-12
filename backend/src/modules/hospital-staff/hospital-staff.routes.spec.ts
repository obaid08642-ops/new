import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA, GUARDS_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { HospitalStaffController } from './hospital-staff.module';
import { HospitalController } from '../hospital/controllers/hospital.controller';
import { JwtAuthGuard } from '../../common/auth.guard';

/** Merge map row 3 (owner approved 2026-11-10): one module owns /hospital/staff; URLs, methods and the guard are the ones clients already call. */
function routes(ctrl: { prototype: object }): string[] {
  const base = Reflect.getMetadata(PATH_METADATA, ctrl) as string;
  const out: string[] = [];
  for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
    const fn = Object.getOwnPropertyDescriptor(ctrl.prototype, name)?.value as unknown;
    if (typeof fn !== 'function') continue;
    const method = Reflect.getMetadata(METHOD_METADATA, fn as object) as number | undefined;
    if (method === undefined) continue;
    const path = (Reflect.getMetadata(PATH_METADATA, fn as object) as string) || '/';
    out.push(`${RequestMethod[method]} /${[base, path === '/' ? '' : path].filter(Boolean).join('/')}`);
  }
  return out.sort();
}

describe('hospital/staff routes after the controller merge', () => {
  it('HospitalStaffController serves every /hospital/staff URL the clients call, with the same methods', () => {
    expect(routes(HospitalStaffController)).toEqual([
      'DELETE /hospital/staff/:id',
      'GET /hospital/staff',
      'PATCH /hospital/staff/:id',
      'POST /hospital/staff',
      'POST /hospital/staff/:id/reset-password',
      'POST /hospital/staff/:id/suspend',
      'PUT /hospital/staff/:id/credentials',
    ]);
  });

  it('HospitalController no longer declares any /hospital/staff route, and keeps its other routes', () => {
    const r = routes(HospitalController);
    expect(r.filter((x) => x.includes('/hospital/staff'))).toEqual([]);
    expect(r).toEqual(expect.arrayContaining(['POST /hospital/branches', 'GET /hospital/branches', 'POST /hospital/doctors/onboard', 'GET /hospital/appointments']));
  });

  it('both controllers keep the JWT guard and the same role list', () => {
    for (const c of [HospitalStaffController, HospitalController]) {
      expect((Reflect.getMetadata(GUARDS_METADATA, c) as unknown[]) || []).toContain(JwtAuthGuard);
    }
    const rolesOf = (c: object) => JSON.stringify(Reflect.getMetadata('roles', c));
    expect(rolesOf(HospitalStaffController)).toBe(rolesOf(HospitalController));
  });
});
