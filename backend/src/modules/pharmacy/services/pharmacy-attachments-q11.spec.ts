/** Q-11: writer and readers share one attachment shape {type, uri}. */
import { PharmacyBroadcastService } from './pharmacy-broadcast.service';

describe('Q-11 one attachment shape', () => {
  const svc: any = new (PharmacyBroadcastService as any)(
    {}, {}, {}, {},
    { find: () => ({ lean: async () => [] }), db: { collection: () => ({ find: () => ({ project: () => ({ toArray: async () => [] }) }) }) } },
    { find: () => ({ lean: async () => [] }) },
    { findOne: () => ({ lean: async () => null }) },
    {}, {}, { distanceKm: () => 1 }, {}, {}, {}, {}, {}, {},
  );

  it('broadcast exposes image+pdf as {type, uri} and drops voice', async () => {
    const dto: any = await svc.providerBroadcastDto(
      { id: 'b1', order_id: 'o1', current_round: 1, lock_state: 'open' },
      {
        id: 'o1', payment_method: 'cash', delivery: { method: 'delivery' },
        prescription_attachments: [
          { type: 'image', uri: 'https://cdn/rx1.jpg' },
          { type: 'pdf', uri: 'https://cdn/rx2.pdf' },
          { type: 'voice', uri: 'https://cdn/note.m4a' },
        ],
        items: [],
      },
      {},
    );
    expect(dto.attachments).toEqual([
      { type: 'image', uri: 'https://cdn/rx1.jpg' },
      { type: 'pdf', uri: 'https://cdn/rx2.pdf' },
    ]);
  });
});
