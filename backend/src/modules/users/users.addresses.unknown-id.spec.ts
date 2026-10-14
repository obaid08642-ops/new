import { NotFoundException } from '@nestjs/common';
import { UsersAddressesController } from './users.addresses.controller';

// Needs-review issue 380: PATCH/DELETE of an address the caller does not have is 404 and changes nothing.
describe('UsersAddressesController unknown address id', () => {
  const make = () => {
    const addresses = [{ id: 'a1', label: 'home', is_default: true }];
    const users: any = { getPatientProfile: jest.fn().mockResolvedValue({ addresses }), updatePatientProfile: jest.fn() };
    return { users, addresses, controller: new UsersAddressesController(users) };
  };

  it('PATCH answers 404 and keeps the default address', async () => {
    const { users, addresses, controller } = make();
    await expect(controller.updateAddress('p1', 'someone-elses', { is_default: true } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(users.updatePatientProfile).not.toHaveBeenCalled();
    expect(addresses[0].is_default).toBe(true);
  });

  it('DELETE answers 404 and writes nothing', async () => {
    const { users, controller } = make();
    await expect(controller.removeAddress('p1', 'someone-elses')).rejects.toBeInstanceOf(NotFoundException);
    expect(users.updatePatientProfile).not.toHaveBeenCalled();
  });

  it('PATCH of the caller\'s own address still saves', async () => {
    const { users, controller } = make();
    await expect(controller.updateAddress('p1', 'a1', { label: 'work' } as any)).resolves.toMatchObject({ id: 'a1', label: 'work' });
    expect(users.updatePatientProfile).toHaveBeenCalled();
  });
});
