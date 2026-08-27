import * as ExcelJS from 'exceljs';
import { LegalEnterpriseService } from './legal-enterprise.service';

describe('LegalEnterpriseService settlement XLSX export', () => {
  it('writes settlement and totals sheets with the existing column contract', async () => {
    const service = new LegalEnterpriseService({ collection: jest.fn() } as any);
    jest.spyOn(service, 'settlementData').mockResolvedValue({
      rows: [{ order_id: 'order-1', date: '2026-08-19T00:00:00.000Z', total: 100, commission_percent: 15, commission: 15, vat_on_commission: 2.25, net_provider: 82.75, state: 'COMPLETED', payout_status: 'reserved', payout_reference: null, payment_date: null }],
      totals: { total: 100, commission: 15, vat: 2.25, net: 82.75 }, transfers: [], generated_at: new Date(),
    } as any);

    const buffer = await service.settlementExcel('provider-1');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Settlements', 'Totals']);
    expect(workbook.getWorksheet('Settlements')?.getRow(1).values).toContain('Order ID');
    expect(workbook.getWorksheet('Settlements')?.getRow(2).getCell(1).value).toBe('order-1');
    expect(workbook.getWorksheet('Totals')?.getRow(2).getCell(1).value).toBe('Gross Total');
  });
});
