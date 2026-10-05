import { NotFoundException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { CatalogsController } from './catalogs.controller';
import { FacilityInboxController } from '../facility-ops/facility-compat.controller';

/**
 * 404 only when the target does not exist (matchedCount 0). A repeat on an
 * existing target (matchedCount 1, modifiedCount 0) is an idempotent success.
 */
type UpdateResult = { matchedCount: number; modifiedCount: number };

function connWith(result: UpdateResult) {
  const col = {
    updateOne: jest.fn().mockResolvedValue(result),
    findOne: jest.fn().mockResolvedValue({ id: 'acct-1', facility_id: 'fac-1' }),
  };
  const conn = { collection: jest.fn().mockReturnValue(col) } as unknown as Connection;
  return { conn, col };
}

describe('CatalogsController.deleteSpecialty existence semantics', () => {
  it('404s for an unknown specialty code', async () => {
    const { conn } = connWith({ matchedCount: 0, modifiedCount: 0 });
    await expect(new CatalogsController(conn).deleteSpecialty('nosuch')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('is idempotent for an already-inactive specialty', async () => {
    const { conn } = connWith({ matchedCount: 1, modifiedCount: 0 });
    await expect(new CatalogsController(conn).deleteSpecialty('cardiology')).resolves.toEqual({ ok: true });
  });

  it('deactivates an active specialty', async () => {
    const { conn } = connWith({ matchedCount: 1, modifiedCount: 1 });
    await expect(new CatalogsController(conn).deleteSpecialty('cardiology')).resolves.toEqual({ ok: true });
  });
});

describe('FacilityInboxController.markRead existence semantics', () => {
  const user = { id: 'acct-1' };

  it('404s for an unknown (or foreign) inbox message', async () => {
    const { conn } = connWith({ matchedCount: 0, modifiedCount: 0 });
    await expect(new FacilityInboxController(conn).markRead('507f1f77bcf86cd799439011', user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('is idempotent for an already-read message', async () => {
    const { conn, col } = connWith({ matchedCount: 1, modifiedCount: 0 });
    await expect(new FacilityInboxController(conn).markRead('msg-1', user)).resolves.toEqual({ ok: true });
    expect(col.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ facility_id: 'fac-1' }),
      { $set: { read: true } },
    );
  });
});
