import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection, Model } from 'mongoose';
import { ProviderType } from '../../common/enums';
import { ServiceCatalogService } from './service-catalog.module';
import { RadiologyOpsService } from '../radiology/radiology.service';
import { MedicinesService } from '../medicines/medicines.service';
import { AdminDeviceService } from '../auth/admin-device.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { RedisService } from '../redis/redis.service';
import { CatalogPublicationService } from '../events/catalog-publication.service';

/**
 * c3b4fb6 hygiene: schedule entity types come from the ProviderType enum, and
 * only a malformed id maps to 404 — a real DB failure is not disguised as 404.
 */
const castError = () => Object.assign(new Error('Cast to string failed'), { name: 'CastError' });
const dbDown = () => Object.assign(new Error('connection timed out'), { name: 'MongoNetworkTimeoutError' });
type AnyModel = Model<Record<string, unknown>>;

describe('ServiceCatalogService schedule entity_type', () => {
  const sched = {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ weekly: {} }) }),
    create: jest.fn(),
    findOneAndUpdate: jest.fn().mockResolvedValue({ id: 's1', toObject: () => ({ id: 's1' }) }),
  };
  const bus = { emit: jest.fn().mockResolvedValue(undefined) };
  const svc = new ServiceCatalogService(
    ...([{}, {}, {}, {}, sched, bus] as unknown as ConstructorParameters<typeof ServiceCatalogService>),
  );
  const user = { id: 'prov-1', role: 'provider' };

  it.each(Object.values(ProviderType))('accepts every ProviderType value (%s)', async (type) => {
    await expect(svc.upsertSchedule(user, type, { slot_minutes: 30 })).resolves.toEqual({ id: 's1' });
  });

  it('rejects an entity_type outside the enum on read and write (no schedule doc created)', async () => {
    await expect(svc.upsertSchedule(user, 'bogus_type', {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.getSchedule(user, 'bogus_type')).rejects.toBeInstanceOf(BadRequestException);
    expect(sched.create).not.toHaveBeenCalled();
  });
});

describe('RadiologyOpsService.findBooking error mapping', () => {
  const make = (findOne: jest.Mock) => {
    const none = {} as unknown as AnyModel;
    return new RadiologyOpsService(
      none, { findOne } as unknown as AnyModel, { findOne: jest.fn().mockResolvedValue(null) } as unknown as AnyModel,
      none, none, none, none, {} as unknown as WorkflowEngineService, new EventEmitter2(),
    ) as unknown as { findBooking(id: string): Promise<unknown> };
  };

  it('maps a malformed id (CastError) to 404', async () => {
    await expect(make(jest.fn().mockRejectedValue(castError())).findBooking('bad')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows a real DB error instead of answering 404', async () => {
    const err = dbDown();
    await expect(make(jest.fn().mockRejectedValue(err)).findBooking('bkg-1')).rejects.toBe(err);
  });
});

describe('MedicinesService.clearShortageBadge error mapping', () => {
  const make = (updateOne: jest.Mock) => new MedicinesService(
    { updateOne } as unknown as ConstructorParameters<typeof MedicinesService>[0],
    new EventEmitter2(),
    {} as unknown as RedisService,
    { collection: () => ({ insertOne: jest.fn().mockResolvedValue({}) }) } as unknown as Connection,
    {} as unknown as CatalogPublicationService,
  );

  it('rethrows a real DB error instead of answering 404', async () => {
    const err = dbDown();
    await expect(make(jest.fn().mockRejectedValue(err)).clearShortageBadge('med-1', 'admin-1')).rejects.toBe(err);
  });
});

describe('AdminDeviceService.revoke error mapping', () => {
  const ID = '507f1f77bcf86cd799439011';
  const make = (updateOne: jest.Mock) => new AdminDeviceService(
    { collection: () => ({ updateOne, findOne: jest.fn().mockResolvedValue(null) }) } as unknown as Connection,
  );

  it('rethrows a real DB error instead of answering 404', async () => {
    const err = dbDown();
    await expect(make(jest.fn().mockRejectedValue(err)).revoke('admin-1', ID)).rejects.toBe(err);
  });

  it('is idempotent for an already-revoked device and 404s for an unknown one', async () => {
    await expect(make(jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 0 })).revoke('admin-1', ID)).resolves.toEqual({ ok: true });
    await expect(make(jest.fn().mockResolvedValue({ matchedCount: 0, modifiedCount: 0 })).revoke('admin-1', ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
