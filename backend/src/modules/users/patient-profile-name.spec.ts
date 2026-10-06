import { UsersService } from './users.service';

describe('GET /users/me/profile carries the account name (Batch 0 review B3)', () => {
  const make = (user: Record<string, unknown> | null, profile: Record<string, unknown> | null) => {
    const userRepository = { findOne: jest.fn(async () => user) };
    const patientRepository = { findOne: jest.fn(async () => profile), create: jest.fn(async (p: Record<string, unknown>) => p) };
    const svc = Object.create(UsersService.prototype) as UsersService;
    Object.assign(svc, { userRepository, patientRepository });
    return svc;
  };

  it('fills full_name from the account when the profile has none (registration never wrote it)', async () => {
    const svc = make({ id: 'u1', full_name: 'سارة أحمد' }, { user_id: 'u1', chronic_diseases: [] });
    await expect(svc.getPatientProfile('u1')).resolves.toEqual(expect.objectContaining({ full_name: 'سارة أحمد', chronic_conditions: [] }));
  });

  it('prefers the account name, which PATCH /users/me updates', async () => {
    const svc = make({ id: 'u1', full_name: 'الاسم الجديد' }, { user_id: 'u1', full_name: 'الاسم القديم' });
    await expect(svc.getPatientProfile('u1')).resolves.toEqual(expect.objectContaining({ full_name: 'الاسم الجديد' }));
  });

  it('returns null, not an invented name, when nobody entered one', async () => {
    const svc = make({ id: 'u1', full_name: '' }, null);
    await expect(svc.getPatientProfile('u1')).resolves.toEqual(expect.objectContaining({ full_name: null }));
  });
});
