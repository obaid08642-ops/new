import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UnifiedBookingsService } from './unified-bookings.module';

// PT-54: the patient hides or shows a finished visit in their own history (collection patient_hidden_visits).
describe('unified bookings: hide and show a visit (PT-54)', () => {
  const find = (rows: any[]) => ({ find: () => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }) }) });
  const one = (rows: any[]) => ({ findOne: (q: any) => ({ lean: async () => rows.find((r) => r.id === q.id.$eq && (r.patient_id ?? r.patient_account_id) === (q.patient_id ?? q.patient_account_id).$eq) ?? null }) });

  const make = (hiddenRows: any[] = []) => {
    const store = [...hiddenRows];
    const col = {
      find: (q: any) => ({ toArray: async () => store.filter((r) => r.patient_id === q.patient_id.$eq) }),
      updateOne: jest.fn(async (key: any, upd: any) => { if (!store.some((r) => r.patient_id === key.patient_id && r.kind === key.kind && r.booking_id === key.booking_id)) store.push(upd.$setOnInsert); }),
      deleteMany: jest.fn(async (key: any) => { for (let i = store.length - 1; i >= 0; i--) if (store[i].patient_id === key.patient_id && store[i].kind === key.kind && store[i].booking_id === key.booking_id) store.splice(i, 1); }),
    };
    const conn: any = { collection: (name: string) => { expect(name).toBe('patient_hidden_visits'); return col; } };
    const labRows = [
      { id: 'l-done', patient_id: 'p1', state: 'REPORT_READY', createdAt: new Date('2026-10-01') },
      { id: 'l-open', patient_id: 'p1', state: 'CONFIRMED', createdAt: new Date('2026-10-02') },
      { id: 'l-other', patient_id: 'p2', state: 'REPORT_READY', createdAt: new Date('2026-10-03') },
    ];
    const labs: any = { ...find(labRows.filter((r) => r.patient_id === 'p1')), ...one(labRows) };
    const apptRows = [{ id: 'a-cancelled', patient_id: 'p1', status: 'CANCELLED', createdAt: new Date('2026-10-04') }];
    const appts: any = { ...find(apptRows), ...one(apptRows) };
    const empty: any = { ...find([]), ...one([]) };
    const svc = new UnifiedBookingsService(
      empty, empty, labs, empty, empty, appts, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, conn,
    );
    return { svc, store, col };
  };
  const p1 = { id: 'p1', role: 'patient' };

  it('hides a finished visit, and the list leaves it out unless include_hidden is asked for', async () => {
    const { svc, store } = make();
    expect(await svc.setVisitHidden(p1, 'lab', 'l-done', true)).toEqual({ ok: true, kind: 'lab', id: 'l-done', hidden: true });
    expect(store).toHaveLength(1);
    const def: any[] = await svc.myTimeline(p1, {});
    expect(def.map((x) => x.id).sort()).toEqual(['a-cancelled', 'l-open']);
    const all: any[] = await svc.myTimeline(p1, { include_hidden: true });
    expect(all.map((x) => [x.id, x.hidden]).sort()).toEqual([['a-cancelled', false], ['l-done', true], ['l-open', false]]);
  });

  it('is idempotent both ways and shows the visit again', async () => {
    const { svc, store } = make();
    await svc.setVisitHidden(p1, 'lab', 'l-done', true);
    await svc.setVisitHidden(p1, 'lab', 'l-done', true);
    expect(store).toHaveLength(1);
    expect(await svc.setVisitHidden(p1, 'lab', 'l-done', false)).toMatchObject({ hidden: false });
    expect(await svc.setVisitHidden(p1, 'lab', 'l-done', false)).toMatchObject({ hidden: false });
    expect(store).toHaveLength(0);
    expect((await svc.myTimeline(p1, {})).map((x: any) => x.id)).toContain('l-done');
  });

  it('a cancelled consultation can be hidden; an open visit cannot', async () => {
    const { svc } = make();
    await expect(svc.setVisitHidden(p1, 'consultation', 'a-cancelled', true)).resolves.toMatchObject({ hidden: true, kind: 'consultation' });
    await expect(svc.setVisitHidden(p1, 'lab', 'l-open', true)).rejects.toThrow(BadRequestException);
  });

  it("only the owner: someone else's visit and an unknown id are 404, an unknown kind is 400", async () => {
    const { svc, store } = make();
    await expect(svc.setVisitHidden(p1, 'lab', 'l-other', true)).rejects.toThrow(NotFoundException);
    await expect(svc.setVisitHidden(p1, 'lab', 'nope', false)).rejects.toThrow(NotFoundException);
    await expect(svc.setVisitHidden(p1, 'spa', 'x', true)).rejects.toThrow(BadRequestException);
    await expect(svc.setVisitHidden(p1, 'lab', { $ne: '' } as any, true)).rejects.toThrow(NotFoundException);
    expect(store).toHaveLength(0);
  });

  it("one patient's hidden flag does not hide the visit for anyone else", async () => {
    const { svc } = make([{ patient_id: 'p2', kind: 'lab', booking_id: 'l-done' }]);
    expect((await svc.myTimeline(p1, {})).map((x: any) => x.id)).toContain('l-done');
  });
});
