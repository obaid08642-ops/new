import * as ExcelJS from 'exceljs';
import { AiService } from './ai.service';

describe('AiService Excel parsing', () => {
  it('maps a supported bilingual prescription worksheet from an XLSX buffer', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Prescription');
    sheet.addRow(['اسم الدواء', 'الكمية', 'ملاحظات']);
    sheet.addRow(['دواء اختباري', 2, 'بعد الطعام']);
    const service = new AiService({ collection: jest.fn() } as any, {} as any);

    const result = await service.parseExcel(Buffer.from(await workbook.xlsx.writeBuffer()));

    expect(result).toEqual({ success: true, items: [{ medicine_id: null, raw_name_string: 'دواء اختباري', requested_quantity: 2, notes: 'بعد الطعام' }] });
  });

  it('returns the existing safe empty result for an invalid workbook buffer', async () => {
    const service = new AiService({ collection: jest.fn() } as any, {} as any);

    await expect(service.parseExcel(Buffer.from('not-an-xlsx'))).resolves.toEqual({ success: false, items: [] });
  });
});
