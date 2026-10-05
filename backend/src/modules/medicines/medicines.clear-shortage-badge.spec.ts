import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { MedicinesService } from './medicines.service';
import { RedisService } from '../redis/redis.service';
import { CatalogPublicationService } from '../events/catalog-publication.service';

/**
 * POST /medicines/admin/catalog/:id/clear-shortage-badge.
 * MedicineRepository.updateOne is findOneAndUpdate: it resolves to the
 * updated document, or null when no medicine matches.
 */
describe('MedicinesService.clearShortageBadge', () => {
  function make(updateOne: jest.Mock) {
    const insertOne = jest.fn().mockResolvedValue({});
    const service = new MedicinesService(
      { updateOne, findOne: jest.fn().mockResolvedValue(null) } as unknown as ConstructorParameters<typeof MedicinesService>[0],
      new EventEmitter2(),
      {} as unknown as RedisService,
      { collection: () => ({ insertOne }) } as unknown as Connection,
      {} as unknown as CatalogPublicationService,
    );
    return { service, insertOne };
  }

  it('404s for an unknown medicine id and writes no audit event', async () => {
    const { service, insertOne } = make(jest.fn().mockResolvedValue(null));
    await expect(service.clearShortageBadge('med-unknown', 'admin-1')).rejects.toThrow(new NotFoundException('medicine_not_found'));
    expect(insertOne).not.toHaveBeenCalled();
  });

  it('404s for a malformed id (CastError from the driver)', async () => {
    const cast = Object.assign(new Error('Cast to string failed for value "{}"'), { name: 'CastError' });
    const { service } = make(jest.fn().mockRejectedValue(cast));
    await expect(service.clearShortageBadge('abc', 'admin-1')).rejects.toThrow(new NotFoundException('medicine_not_found'));
  });

  it('clears the badge of an existing medicine and audits it', async () => {
    const updateOne = jest.fn().mockResolvedValue({ id: 'med-1', availability_status: 'none' });
    const { service, insertOne } = make(updateOne);
    await expect(service.clearShortageBadge('med-1', 'admin-1')).resolves.toEqual({ ok: true });
    expect(updateOne).toHaveBeenCalledWith(
      { id: { $eq: 'med-1' } },
      { $set: expect.objectContaining({ availability_status: 'none', shortage_notes: null }) },
    );
    expect(insertOne).toHaveBeenCalledWith(expect.objectContaining({ type: 'medicine.shortage_badge_cleared', entity_id: 'med-1' }));
  });
});
