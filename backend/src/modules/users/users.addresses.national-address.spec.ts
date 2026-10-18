/** 19.7: a saved address can carry a Saudi National Address short code. */
import { BadRequestException } from '@nestjs/common';
import { UsersAddressesController } from './users.addresses.controller';

const SPL = { outcome: 'found', address: { short_address: 'RRRD2929', building_number: '8228', additional_number: '2929', post_code: '12611', street: 'King Fahd Rd', district: 'Olaya', city: 'Riyadh', region: 'Riyadh', lat: 24.69, lng: 46.72 } };

function setup(lookup: any, saved: any[] = []) {
  const profile = { addresses: saved };
  const users: any = { getPatientProfile: jest.fn(async () => profile), updatePatientProfile: jest.fn(async (_id: string, data: any) => { profile.addresses = data.addresses; }) };
  const national: any = { lookup: jest.fn(async () => lookup) };
  return { ctrl: new UsersAddressesController(users, national), national, profile };
}

describe('addresses with a short address', () => {
  it('a code alone is enough: Saudi Post fills the street, city, building and pin, and the address is verified', async () => {
    const { ctrl, profile } = setup(SPL);
    await ctrl.addAddress('u1', { short_address: 'rrrd 2929' } as any);
    expect(profile.addresses[0]).toMatchObject({ short_address: 'RRRD2929', national_address_verified: true, building_number: '8228', additional_number: '2929', post_code: '12611', street: 'King Fahd Rd', line1: 'King Fahd Rd', city: 'Riyadh', lat: 24.69, lng: 46.72, is_default: true });
  });

  it('what the patient typed stays; Saudi Post only fills what is empty (but owns building, additional number, post code)', async () => {
    const { ctrl, profile } = setup(SPL);
    await ctrl.addAddress('u1', { short_address: 'RRRD2929', street: 'My street', city: 'Jeddah', lat: 21.5, lng: 39.2 } as any);
    expect(profile.addresses[0]).toMatchObject({ street: 'My street', city: 'Jeddah', lat: 21.5, lng: 39.2, district: 'Olaya', building_number: '8228', national_address_verified: true });
  });

  it('refuses a malformed code and a code Saudi Post does not know, and saves nothing', async () => {
    const bad = setup(SPL);
    await expect(bad.ctrl.addAddress('u1', { short_address: 'nope', street: 'x' } as any)).rejects.toThrow(new BadRequestException('short_address_invalid'));
    const unknown = setup({ outcome: 'not_found' });
    await expect(unknown.ctrl.addAddress('u1', { short_address: 'RRRD2929', street: 'x' } as any)).rejects.toThrow(new BadRequestException('short_address_not_found'));
    expect(bad.profile.addresses).toEqual([]);
    expect(unknown.profile.addresses).toEqual([]);
  });

  it('when Saudi Post cannot answer the code is kept but not verified, and a street or pin is still required', async () => {
    const { ctrl, profile } = setup({ outcome: 'unavailable' });
    await expect(ctrl.addAddress('u1', { short_address: 'RRRD2929' } as any)).rejects.toThrow('address_location_required');
    await ctrl.addAddress('u1', { short_address: 'RRRD2929', street: 'My street' } as any);
    expect(profile.addresses[0]).toMatchObject({ short_address: 'RRRD2929', national_address_verified: false, street: 'My street' });
  });

  it('an address without a code never calls Saudi Post', async () => {
    const { ctrl, national } = setup(SPL);
    await ctrl.addAddress('u1', { street: 'My street' } as any);
    expect(national.lookup).not.toHaveBeenCalled();
  });

  it('update: a changed code is looked up, the same verified code is not, an empty one removes the verification', async () => {
    const existing = { id: 'a1', street: 'My street', short_address: 'RRRD2929', national_address_verified: true, building_number: '8228' };
    const same = setup(SPL, [{ ...existing }]);
    await same.ctrl.updateAddress('u1', 'a1', { short_address: 'rrrd2929', notes: 'gate 2' } as any);
    expect(same.national.lookup).not.toHaveBeenCalled();
    const changed = setup({ outcome: 'found', address: { ...SPL.address, short_address: 'JEDA1234', building_number: '11' } }, [{ ...existing }]);
    await changed.ctrl.updateAddress('u1', 'a1', { short_address: 'JEDA1234' } as any);
    expect(changed.profile.addresses[0]).toMatchObject({ short_address: 'JEDA1234', building_number: '11', street: 'My street' });
    const cleared = setup(SPL, [{ ...existing }]);
    await cleared.ctrl.updateAddress('u1', 'a1', { short_address: '' } as any);
    expect(cleared.profile.addresses[0].short_address).toBeUndefined();
    expect(cleared.profile.addresses[0].national_address_verified).toBeUndefined();
    expect(cleared.profile.addresses[0].street).toBe('My street');
  });
});
