import { CatalogPublicationService } from './catalog-publication.service';
import { EventBusService } from './event-bus.service';

describe('CatalogPublicationService', () => {
  const approvedMedicine = {
    id: 'med-1',
    slug: 'panadol',
    public_eligibility: true,
    indexing_eligibility: false,
    medical_review_status: 'approved',
    provenance: 'admin_medicine_review',
    is_deleted: false,
    updatedAt: new Date('2026-08-20T00:00:00.000Z'),
  };

  function setup(source: any) {
    const sourceCollection = { findOne: jest.fn().mockResolvedValue(source) };
    const projectionCollection = { updateOne: jest.fn().mockResolvedValue({ acknowledged: true }) };
    const conn = {
      collection: jest.fn((name: string) => name === 'medicines_master' ? sourceCollection : projectionCollection),
    } as any;
    const redis = { del: jest.fn().mockResolvedValue(undefined) } as any;
    const events = { emit: jest.fn().mockResolvedValue({ duplicate: false }) } as any;
    return { service: new CatalogPublicationService(conn, redis, events), sourceCollection, projectionCollection, redis, events };
  }

  it('projects an approved entity, retains noindex until indexing is explicitly allowed, invalidates cache and emits an idempotent audit event', async () => {
    const { service, projectionCollection, redis, events } = setup(approvedMedicine);

    const result = await service.refresh({
      entityType: 'medicine',
      entityId: 'med-1',
      actorId: 'admin-1',
      reason: 'medicine_approved',
      idempotencyKey: 'catalog-publication:medicine:med-1:medicine_approved:2026-08-20T00:00:00.000Z',
    });

    expect(result).toMatchObject({ published: true, indexable: false, canonical_path: '/medicines/panadol', deep_link: 'nabdplus://medicine/med-1' });
    expect(projectionCollection.updateOne).toHaveBeenCalledWith(
      { entity_type: 'medicine', entity_id: 'med-1' },
      expect.objectContaining({ $set: expect.objectContaining({ published: true, metadata: { robots: 'noindex,nofollow' } }) }),
      { upsert: true },
    );
    expect(redis.del).toHaveBeenCalledTimes(3);
    expect(events.emit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'catalog.publication.projected',
      idempotency_key: 'catalog-publication:medicine:med-1:medicine_approved:2026-08-20T00:00:00.000Z',
      after: expect.objectContaining({ published: true, indexable: false }),
    }));
  });

  it('creates a withdrawal projection for an unapproved or unpublished source instead of exposing it', async () => {
    const { service, projectionCollection } = setup({ ...approvedMedicine, public_eligibility: false, medical_review_status: 'pending' });

    const result = await service.refresh({
      entityType: 'medicine', entityId: 'med-1', actorId: 'admin-1', reason: 'migration_backfill', idempotencyKey: 'migration:med-1',
    });

    expect(result).toMatchObject({ published: false, indexable: false, feed: { included: false }, sitemap: expect.objectContaining({ included: false }) });
    expect(projectionCollection.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ $set: expect.objectContaining({ published: false }) }),
      { upsert: true },
    );
  });
});

describe('EventBusService idempotency', () => {
  it('does not fan out a command when the durable unique idempotency key already exists', async () => {
    const repository = { create: jest.fn().mockRejectedValue({ code: 11000, message: 'duplicate key' }) } as any;
    const emitter = { emit: jest.fn() } as any;
    const service = new EventBusService(repository, emitter);

    await expect(service.emit({
      type: 'catalog.publication.projected', entity_type: 'medicine', entity_id: 'med-1', idempotency_key: 'same-command',
    })).resolves.toEqual({ duplicate: true });

    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('persists then fans out a new command exactly once', async () => {
    const repository = { create: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any;
    const emitter = { emit: jest.fn() } as any;
    const service = new EventBusService(repository, emitter);

    await expect(service.emit({
      type: 'catalog.publication.projected', entity_type: 'medicine', entity_id: 'med-1', idempotency_key: 'new-command',
    })).resolves.toEqual({ duplicate: false });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ idempotency_key: 'new-command' }));
    expect(emitter.emit).toHaveBeenCalledTimes(1);
  });
});
