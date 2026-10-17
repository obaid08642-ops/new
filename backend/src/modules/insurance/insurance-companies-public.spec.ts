import { PUBLIC_KEY } from '../../common/auth.guard';
import { InsuranceController } from './insurance.module';
import { InsuranceFlowController } from '../insurance-engine/insurance-engine.module';

// Issue 1550: a guest sees the insurers and their plans on /insurance. One handler answers GET /insurance/companies, and it is public.
describe('GET /insurance/companies', () => {
  it('is the public catalogue handler of InsuranceController', () => {
    expect(Reflect.getMetadata(PUBLIC_KEY, InsuranceController.prototype.companies)).toBe(true);
    expect(Reflect.getMetadata('path', InsuranceController.prototype.companies)).toBe('companies');
  });

  it('is not shadowed by a second handler that asks for a session', () => {
    const paths = Object.getOwnPropertyNames(InsuranceFlowController.prototype)
      .map((name) => (InsuranceFlowController.prototype as unknown as Record<string, unknown>)[name])
      .filter((fn): fn is object => typeof fn === 'function')
      .map((fn) => ({ path: Reflect.getMetadata('path', fn), method: Reflect.getMetadata('method', fn) }));
    expect(paths.filter((p) => p.path === 'companies' && p.method === 0)).toEqual([]);
  });

  it('keeps the patient\'s own policy behind the sign-in', () => {
    expect(Reflect.getMetadata(PUBLIC_KEY, InsuranceFlowController.prototype.myPolicy)).toBeUndefined();
  });
});
