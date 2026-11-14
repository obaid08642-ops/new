import 'reflect-metadata';
import { LabResultsController } from './lab-results.controller';
import { UserRole } from '../../common/enums';

// The patient app calls GET /lab-results/mine and /by-booking/:id; a class-level staff-only role list made both 403.
const rolesOf = (name: keyof LabResultsController) => {
  const keys = Reflect.getMetadataKeys(LabResultsController.prototype[name] as any);
  const own = keys.map((k) => Reflect.getMetadata(k, LabResultsController.prototype[name] as any)).find((v) => Array.isArray(v) && v.every((x) => typeof x === 'string'));
  return own as string[] | undefined;
};

describe('LabResultsController roles', () => {
  it.each(['mine', 'byBkg', 'one'] as const)('%s admits the patient', (m) => {
    expect(rolesOf(m)).toContain(UserRole.PATIENT);
  });
  it('create stays staff-only (no method override, class list has no patient)', () => {
    expect(rolesOf('create')).toBeUndefined();
    const cls = Reflect.getMetadata('roles', LabResultsController) as string[] | undefined;
    expect(cls).not.toContain(UserRole.PATIENT);
  });
});
