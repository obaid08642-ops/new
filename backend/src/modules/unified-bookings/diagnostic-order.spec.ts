import { UnifiedBookingsService } from './unified-bookings.module';

/** F74: diagnostics parent order — totals, rollback, validation. */
describe('UnifiedBookingsService.createDiagnosticOrder', () => {
  const make = () => {
    const saved: any = { lines: [], save: jest.fn().mockResolvedValue(undefined), toObject: () => saved };
    const diagOrders: any = {
      create: jest.fn().mockImplementation(async (doc: any) => {
        Object.assign(saved, doc);
        return saved;
      }),
    };
    const labsSvc: any = {
      book: jest.fn().mockResolvedValue({ id: 'lab-b1', total: 100, state: 'NEW_REQUEST' }),
      cancel: jest.fn().mockResolvedValue({}),
    };
    const radSvc: any = {
      book: jest.fn().mockResolvedValue({ id: 'rad-b1', total_price: 250, state: 'NEW_REQUEST' }),
      cancel: jest.fn().mockResolvedValue({}),
    };
    const svc = new UnifiedBookingsService(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, diagOrders,
      {} as any, labsSvc, radSvc, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    return { svc, diagOrders, labsSvc, radSvc, saved };
  };

  it('creates one parent with lab+radiology children and the summed total', async () => {
    const { svc, saved } = make();
    const out: any = await svc.createDiagnosticOrder({ id: 'p1', role: 'patient' }, {
      lines: [
        { kind: 'lab', service_id: 'cbc', provider_account_id: 'lab-1' },
        { kind: 'radiology', service_id: 'xray' },
      ],
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
      location_type: 'facility',
      payment_method: 'card',
    } as any);
    expect(out.status).toBe('CONFIRMED');
    expect(out.total).toBe(350);
    expect(out.lines.find((l: any) => l.kind === 'lab').booking_id).toBe('lab-b1');
    expect(out.lines.find((l: any) => l.kind === 'radiology').booking_id).toBe('rad-b1');
    expect(saved.save).toHaveBeenCalled();
  });

  it('rolls back created children and fails the parent when a child fails', async () => {
    const { svc, labsSvc, radSvc, saved } = make();
    radSvc.book.mockRejectedValueOnce(new Error('no_slots'));
    await expect(svc.createDiagnosticOrder({ id: 'p1', role: 'patient' }, {
      lines: [
        { kind: 'lab', service_id: 'cbc', provider_account_id: 'lab-1' },
        { kind: 'radiology', service_id: 'xray' },
      ],
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    } as any)).rejects.toThrow('no_slots');
    expect(labsSvc.cancel).toHaveBeenCalledWith('lab-b1', expect.anything());
    expect(saved.status).toBe('FAILED');
  });

  it('rejects bad lines and past slots', async () => {
    const { svc } = make();
    await expect(svc.createDiagnosticOrder({ id: 'p1' }, { lines: [] } as any)).rejects.toThrow();
    await expect(svc.createDiagnosticOrder({ id: 'p1' }, { lines: [{ kind: 'xray', service_id: 's' }] } as any)).rejects.toThrow();
  });
});
