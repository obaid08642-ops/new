/** Q-2: the order's patient passes the chat guards (service already enforces thread ownership). */
import { ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { PharmacyChatController } from './pharmacy.controllers';

const rolesOf = (m: keyof PharmacyChatController) =>
  Reflect.getMetadata(ROLES_KEY, PharmacyChatController.prototype[m]) as string[];

describe('Q-2 chat roles admit the patient', () => {
  for (const m of ['post', 'accept', 'reject', 'remove'] as const) {
    it(`${m} allows patient (+ pharmacy, admin)`, () => {
      const roles = rolesOf(m);
      expect(roles).toContain(UserRole.PATIENT);
      expect(roles).toContain(UserRole.PHARMACY);
      expect(roles).toContain(UserRole.ADMIN);
    });
  }
});
