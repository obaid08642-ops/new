import 'reflect-metadata';
import { PharmacyChatController } from './pharmacy.controllers';
import { ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

// Needs-review issue 517: the patient answers the pharmacy's substitute offer; before, every patient call was 403.
describe('PharmacyChatController roles', () => {
  const roles = (m: keyof PharmacyChatController): string[] => Reflect.getMetadata(ROLES_KEY, PharmacyChatController.prototype[m] as unknown as object) || [];
  it('lets the patient and the pharmacy post messages', () => {
    expect(roles('post')).toEqual(expect.arrayContaining([UserRole.PATIENT, UserRole.PHARMACY]));
  });
  it.each(['accept', 'reject', 'remove'] as const)('lets the patient %s a substitute', (m) => {
    expect(roles(m)).toEqual([UserRole.PATIENT]);
  });
});
