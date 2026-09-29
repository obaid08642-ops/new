import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { AdminRecoveryService } from './admin-recovery.service';

/** C6: recovery codes — single-use, email+code together, no email-only path. */
describe('AdminRecoveryService', () => {
  let svc: AdminRecoveryService;
  const store: any[] = [];
  const conn: any = {
    collection: () => ({
      deleteMany: jest.fn(async () => { store.length = 0; }),
      insertMany: jest.fn(async (docs: any[]) => { store.push(...docs); }),
      countDocuments: jest.fn(async (q: any) => store.filter((d) => d.user_id === q.user_id && !d.used).length),
      find: jest.fn(() => ({ toArray: async () => store.filter((d) => !d.used) })),
      updateOne: jest.fn(async (q: any, u: any) => {
        const d = store.find((x) => x.id === q.id && !x.used);
        if (!d) return { modifiedCount: 0 };
        Object.assign(d, u.$set);
        return { modifiedCount: 1 };
      }),
    }),
  };

  beforeEach(async () => {
    process.env.BCRYPT_ROUNDS = '4';
    store.length = 0;
    const module = await Test.createTestingModule({
      providers: [
        AdminRecoveryService,
        { provide: getConnectionToken(), useValue: conn },
      ],
    }).compile();
    svc = module.get(AdminRecoveryService);
  });

  it('generates 10 codes and reports 10 remaining', async () => {
    const codes = await svc.generate('u1');
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(await svc.remaining('u1')).toBe(10);
  });

  it('consumes a code once; second use is rejected', async () => {
    const codes = await svc.generate('u1');
    await svc.consume('u1', codes[0]);
    expect(await svc.remaining('u1')).toBe(9);
    await expect(svc.consume('u1', codes[0])).rejects.toThrow(ForbiddenException);
  });

  it('rejects unknown codes', async () => {
    await svc.generate('u1');
    await expect(svc.consume('u1', 'XXXX-XXXX-XX')).rejects.toThrow(ForbiddenException);
  });

  it('rejects empty codes', async () => {
    await expect(svc.consume('u1', '')).rejects.toThrow(ForbiddenException);
  });

  it('regenerating invalidates the old set', async () => {
    const old = await svc.generate('u1');
    await svc.generate('u1');
    await expect(svc.consume('u1', old[0])).rejects.toThrow(ForbiddenException);
  });
});
