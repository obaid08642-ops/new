/** 16.8 - the ZAP finding on GET /provider/settlements/excel: the date range is validated, not interpreted. */
import { BadRequestException } from '@nestjs/common';
import { parseSettlementRange } from './legal-enterprise.service';

describe('parseSettlementRange', () => {
  it('no range, one end, or both ends', () => {
    expect(parseSettlementRange()).toEqual({ from: undefined, to: undefined });
    expect(parseSettlementRange('2026-10-01')?.from?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    const r = parseSettlementRange('2026-10-01', '2026-10-31T23:59:59Z');
    expect(r.from?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(r.to?.toISOString()).toBe('2026-10-31T23:59:59.000Z');
  });

  it("the scanner's payloads and other non-dates are a 400, not a query", () => {
    for (const bad of ["from' AND '1'='1' -- ", "from' OR '1'='1' -- ", 'to', '2026-13-45', '2026-10-01; DROP', '1; sleep(5)', '{"$gt":""}', '99999999999', '2026/10/01']) {
      expect(() => parseSettlementRange(bad)).toThrow(BadRequestException);
      expect(() => parseSettlementRange(undefined, bad)).toThrow(BadRequestException);
    }
  });

  it('a range that ends before it starts is refused', () => {
    expect(() => parseSettlementRange('2026-10-31', '2026-10-01')).toThrow('from_after_to');
  });

  it('an object smuggled in as a query value (?from[$gt]=) is refused', () => {
    expect(() => parseSettlementRange({ $gt: '' } as never)).toThrow(BadRequestException);
  });
});
