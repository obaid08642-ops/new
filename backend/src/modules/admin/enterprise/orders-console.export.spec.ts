import { OrdersConsoleService } from './orders-console.service';

/** Walkthrough D3: the CSV export keeps the "problem" filter the table is showing. */
describe('OrdersConsoleService.exportCsv', () => {
  it('passes the problem filter to the list it exports', async () => {
    const svc: any = Object.create(OrdersConsoleService.prototype);
    svc.list = jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, pages: 1 });
    await svc.exportCsv({ kind: 'lab', problem: 'stuck' });
    expect(svc.list).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lab', problem: 'stuck', page: 1 }));
  });

  it('exports only the rows of the filtered list, with the CSV header', async () => {
    const svc: any = Object.create(OrdersConsoleService.prototype);
    svc.list = jest.fn().mockResolvedValue({ data: [{ id: 'o1', kind: 'lab', state: 'pending', total: 10 }], total: 1, page: 1, pages: 1 });
    const out = await svc.exportCsv({ problem: 'failed_payment' });
    expect(out.csv.split('\n')).toHaveLength(2);
    expect(out.csv).toContain('"o1","lab","pending"');
    expect(out.truncated).toBe(false);
  });
});
