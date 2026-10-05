import { Request, Response, NextFunction } from 'express';
import { resolveRequestId, REQUEST_ID_HEADER } from './request-id.middleware';
import { CorrelationMiddleware } from './correlation.middleware';
import { buildLogRecord, logStructured, redactForLog } from './structured-logger';

function mockRes() {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: jest.fn((k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    }),
    getHeader: (k: string) => headers[k.toLowerCase()],
    on: jest.fn(),
  } as unknown as Response;
  return { res, headers };
}

function mockReq(headers: Record<string, unknown> = {}) {
  return { headers, get: () => undefined } as unknown as Request;
}

describe('Phase 20 foundation: request-id + structured logger', () => {
  describe('request-id propagation (mocked, no server)', () => {
    it('propagates an incoming x-request-id onto req + response header', () => {
      const mw = new CorrelationMiddleware();
      const req = mockReq({ [REQUEST_ID_HEADER]: 'req-123' });
      const { res, headers } = mockRes();
      const next: NextFunction = jest.fn() as unknown as NextFunction;

      mw.use(req, res, next);

      expect((req as unknown as Record<string, unknown>)['requestId']).toBe('req-123');
      expect(headers['x-request-id']).toBe('req-123');
      expect(headers['x-correlation-id']).toBe('req-123');
      expect(next).toHaveBeenCalled();
    });

    it('generates a uuid when the header is absent', () => {
      const id = resolveRequestId(mockReq());
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('replaces injected / malformed ids instead of echoing them', () => {
      for (const evil of ['evil\r\nX-Injected: 1', '', 'a'.repeat(200), 'has spaces']) {
        const id = resolveRequestId(mockReq({ [REQUEST_ID_HEADER]: evil }));
        expect(id).not.toBe(evil.trim());
        expect(id).toMatch(/^[0-9a-f-]{36}$/i);
      }
    });
  });

  describe('structured logger PII redaction', () => {
    it('redacts secrets/tokens/PII keys but keeps safe keys, including nested', () => {
      const redacted = redactForLog({
        orderId: 'ord-1',
        password: 'hunter2',
        accessToken: 'tok-abc',
        email: 'patient@example.com',
        phoneNumber: '+966500000000',
        nested: { apiKey: 'k', city: 'Riyadh', deep: { ssn: '1', ok: true } },
      }) as Record<string, any>;

      expect(redacted.orderId).toBe('ord-1');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.accessToken).toBe('[REDACTED]');
      expect(redacted.email).toBe('[REDACTED]');
      expect(redacted.phoneNumber).toBe('[REDACTED]');
      expect(redacted.nested.apiKey).toBe('[REDACTED]');
      expect(redacted.nested.city).toBe('Riyadh');
      expect(redacted.nested.deep.ssn).toBe('[REDACTED]');
      expect(redacted.nested.deep.ok).toBe(true);
    });

    it('builds a JSON-serializable record carrying level/requestId/module/message', () => {
      const record = buildLogRecord('info', 'orders', 'order created', {
        requestId: 'req-123',
        data: { orderId: 'ord-1', password: 'x' },
      });
      expect(record.level).toBe('info');
      expect(record.module).toBe('orders');
      expect(record.msg).toBe('order created');
      expect(record.requestId).toBe('req-123');
      expect((record.data as any).password).toBe('[REDACTED]');
      expect(() => JSON.stringify(record)).not.toThrow();
    });

    it('end-to-end: middleware id flows into the log record', () => {
      const mw = new CorrelationMiddleware();
      const req = mockReq({ [REQUEST_ID_HEADER]: 'req-e2e-1' });
      const { res } = mockRes();
      mw.use(req, res, (jest.fn() as unknown) as NextFunction);

      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      try {
        const record = logStructured('info', 'orders', 'order created', {
          requestId: (req as unknown as Record<string, string>)['requestId'],
          data: { orderId: 'ord-9', email: 'p@example.com' },
        });
        expect(record.requestId).toBe('req-e2e-1');
        const line = writeSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(line);
        expect(parsed.requestId).toBe('req-e2e-1');
        expect(parsed.data.email).toBe('[REDACTED]');
      } finally {
        writeSpy.mockRestore();
      }
    });
  });
});
