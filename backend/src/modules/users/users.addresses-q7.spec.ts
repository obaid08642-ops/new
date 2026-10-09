/** Q-7: PATCH /users/me/addresses/:id with an unknown id -> 404 address_not_found. */
import { NotFoundException } from '@nestjs/common';
import { UsersAddressesController } from './users.addresses.controller';

describe('Q-7 unknown address id', () => {
  const controllerWith = (addresses: any[]) => {
    const users: any = {
      getPatientProfile: async () => ({ addresses }),
      updatePatientProfile: async () => undefined,
    };
    return new UsersAddressesController(users);
  };

  it('throws 404 address_not_found for an unknown id', async () => {
    const c = controllerWith([{ id: 'a1' }]);
    await expect(c.updateAddress('u1', 'nope', {} as any)).rejects.toMatchObject(
      new NotFoundException('address_not_found'),
    );
  });

  it('still updates a known id', async () => {
    const c = controllerWith([{ id: 'a1', street: 'old', line1: 'old' }]);
    const out: any = await c.updateAddress('u1', 'a1', { street: 'new' } as any);
    expect(out.street).toBe('new');
  });
});
