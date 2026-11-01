import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { AdminInsuranceClaimsController, InsuranceController } from './insurance.module';
import { ProviderProductionController } from '../provider-production/provider-production.module';

/**
 * The claim routes a released app or admin page may still call. Nothing here is removed while a released client calls it;
 * a change to this list is a change to the client contract and has to be a decision, not a side effect.
 */
function routes(controller: Function): string[] {
  const base = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '').replace(/^\/|\/$/g, '');
  return Object.getOwnPropertyNames(controller.prototype).flatMap((name) => {
    const handler = controller.prototype[name];
    const method = Reflect.getMetadata(METHOD_METADATA, handler);
    const path = Reflect.getMetadata(PATH_METADATA, handler);
    if (method === undefined || path === undefined) return [];
    return [`${RequestMethod[method]} /${[base, String(path).replace(/^\/|\/$/g, '')].filter(Boolean).join('/')}`];
  });
}

describe('claim routes a released client may call', () => {
  it('patient: submit and list', () => {
    expect(routes(InsuranceController)).toEqual(expect.arrayContaining(['POST /insurance/claims/submit', 'GET /insurance/claims']));
  });
  it('admin: the one decision that moves money', () => {
    expect(routes(AdminInsuranceClaimsController)).toEqual(expect.arrayContaining(['GET /admin/insurance/claims', 'POST /admin/insurance/claims/:id/decide']));
  });
  it('facility: approve, reject and resubmit (status only)', () => {
    expect(routes(ProviderProductionController)).toEqual(expect.arrayContaining(['POST /claims/:id/resubmit', 'POST /claims/:id/approve', 'POST /claims/:id/reject']));
  });
});
