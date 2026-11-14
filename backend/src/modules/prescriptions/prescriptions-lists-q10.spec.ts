/** Q-10: lists never carry the base64 photo; the photo has its own owner-checked GET. */
import { NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';

describe('Q-10 prescription lists without photos', () => {
  const svcWith = (rows: any[]) => {
    const seen: any = {};
    const model: any = {
      find: (filter: any, proj: any) => {
        seen.projection = proj;
        return { sort: () => ({ limit: () => Promise.resolve(rows) }) };
      },
      findOne: (filter: any) => rows.find((r) => r.id === filter?.id) || null,
      distinct: async () => rows.filter((r) => r.upload_image).map((r) => r.id),
    };
    const svc = new (PrescriptionsService as any)(model, {}, { emit: () => undefined }, {}, {});
    return { svc, seen };
  };

  it('listMine excludes upload_image from the projection', async () => {
    const { svc, seen } = svcWith([{ id: 'rx-1' }]);
    await svc.listMine('pat-1');
    expect(seen.projection).toMatchObject({ upload_image: 0 });
  });

  it('listMine marks a scanned prescription and one that became an order, without the photo', async () => {
    const { svc } = svcWith([{ id: 'rx-1', order_id: 'o1' }, { id: 'rx-2', upload_image: 'data:x' }, { id: 'rx-3' }]);
    const out = await svc.listMine('pat-1');
    expect(out.map((r: any) => [r.id, r.isPurchased, r.isOcr])).toEqual([['rx-1', true, false], ['rx-2', false, true], ['rx-3', false, false]]);
  });

  it('owner gets the photo, a stranger gets 404', async () => {
    const rows = [{ id: 'rx-1', patient_id: 'pat-1', upload_image: 'data:image/jpeg;base64,x' }];
    const { svc } = svcWith(rows);
    const got: any = await svc.getImageForUser('rx-1', { id: 'pat-1', role: 'patient' });
    expect(got.upload_image).toContain('base64');
    await expect(svc.getImageForUser('rx-1', { id: 'pat-2', role: 'patient' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
