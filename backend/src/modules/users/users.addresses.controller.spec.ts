import { UsersAddressesController } from './users.addresses.controller';

describe('UsersAddressesController', () => {
  const profile = { addresses: [] as any[] };
  const users = { getPatientProfile: jest.fn(), updatePatientProfile: jest.fn() };
  const controller = new UsersAddressesController(users as any);

  beforeEach(() => {
    jest.clearAllMocks();
    profile.addresses = [];
    users.getPatientProfile.mockResolvedValue(profile);
    users.updatePatientProfile.mockResolvedValue(undefined);
  });

  it('stores a valid mobile location payload and makes the first address default', async () => {
    const result = await controller.addAddress('patient-1', {
      label: 'المنزل', street: 'شارع الملك', building: '12', floor: '3', lat: 24.7136, lng: 46.6753, is_default: false,
    });
    expect(result).toEqual(expect.objectContaining({ id: expect.any(String), street: 'شارع الملك', lat: 24.7136, lng: 46.6753, is_default: true }));
    expect(users.updatePatientProfile).toHaveBeenCalledWith('patient-1', { addresses: [result] });
  });

  it('rejects missing or invalid coordinates before persisting an address', async () => {
    await expect(controller.addAddress('patient-1', { street: 'شارع صحيح', lat: 200, lng: 46 })).rejects.toThrow('invalid_address_lat');
    await expect(controller.addAddress('patient-1', { street: 'شارع صحيح', lat: 24 })).rejects.toThrow('address_coordinates_required');
    expect(users.updatePatientProfile).not.toHaveBeenCalled();
  });

  it('rejects updates for addresses not owned by the current profile', async () => {
    await expect(controller.updateAddress('patient-1', 'missing-address', { city: 'الرياض' })).rejects.toThrow('address_not_found');
    expect(users.updatePatientProfile).not.toHaveBeenCalled();
  });
});
