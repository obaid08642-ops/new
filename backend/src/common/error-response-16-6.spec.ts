/**
 * 16.6 — a forced 500 shows only the error id; the log has the real error, masked; the audit log is append-only.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { Schema, model, type Model } from 'mongoose';
import { SentryExceptionFilter, serverErrorBody, GENERIC_SERVER_ERROR } from './sentry.filter';
import { setLogOutput } from './structured-logger';
import { makeAppendOnly, AppendOnlyViolation } from './append-only';
import { maskPii } from './structured-logger';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn(), setUser: jest.fn() }));

function run(exception: unknown, correlationId?: string) {
  const replies: { body: any; status: number }[] = [];
  const filter = new SentryExceptionFilter({ reply: (_r: unknown, body: any, status: number) => replies.push({ body, status }) } as any);
  const host: any = { switchToHttp: () => ({ getRequest: () => ({ correlationId, user: undefined }), getResponse: () => ({}) }) };
  filter.catch(exception, host);
  return replies[0];
}

describe('16.6 production errors', () => {
  const lines: string[] = [];
  const env = process.env.NODE_ENV;
  beforeEach(() => { lines.length = 0; setLogOutput((l) => lines.push(l)); process.env.NODE_ENV = 'production'; });
  afterEach(() => { setLogOutput(); process.env.NODE_ENV = env; });

  it('an unexpected error answers 500 with the generic message and the request id, nothing else', () => {
    const r = run(new Error('E11000 duplicate key collection: nabd.users index: phone_1 dup key: { phone: "+966501234567" }'), 'req-abc-123');
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ statusCode: 500, code: 'INTERNAL_ERROR', message: GENERIC_SERVER_ERROR, error_id: 'req-abc-123' });
    const text = JSON.stringify(r.body);
    expect(text).not.toMatch(/E11000|users|966|at \w+ \(|stack/i);
  });

  it('a deliberate 5xx keeps its machine code but loses its message in production', () => {
    const r = run(new HttpException({ statusCode: 503, code: 'UPLOAD_SCANNER_UNAVAILABLE', message: 'clamd at 10.0.0.7:3310 refused' }, HttpStatus.SERVICE_UNAVAILABLE), 'req-2');
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ statusCode: 503, code: 'UPLOAD_SCANNER_UNAVAILABLE', message: GENERIC_SERVER_ERROR, error_id: 'req-2' });
  });

  it('a hostile code string is not echoed', () => {
    const b = serverErrorBody(new HttpException({ code: '<script>alert(1)</script>', message: 'x' }, 500), 500, 'id-1', true);
    expect(b.code).toBe('INTERNAL_ERROR');
  });

  it('with no request id a fresh id is made', () => {
    const r = run(new Error('boom'));
    expect(r.body.error_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('the log keeps the real error under the same id, with the phone number masked', () => {
    run(new Error('lookup failed for +966501234567 and a@b.sa'), 'req-log-1');
    const logged = lines.map((l) => JSON.parse(l)).find((r) => r.event === 'exception');
    expect(logged).toMatchObject({ level: 'error', request_id: 'req-log-1', status: 500, module: 'http' });
    expect(logged.details.error_id).toBe('req-log-1');
    expect(logged.details.error_name).toBe('Error');
    expect(lines.join('\n')).not.toMatch(/966501234567|a@b\.sa/);
  });

  it('a 4xx is untouched', () => {
    const replies: any[] = [];
    const filter = new SentryExceptionFilter({ reply: (_r: unknown, body: any, status: number) => replies.push({ body, status }), isHeadersSent: () => false } as any);
    const host: any = { getType: () => 'http', getArgByIndex: () => ({}), switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }) };
    filter.catch(new HttpException('Nope', 403), host);
    expect(replies[0].status).toBe(403);
    expect(replies[0].body.error_id).toBeUndefined();
  });

  it('outside production a deliberate 5xx still shows its message (developers need it), an unknown error never does', () => {
    process.env.NODE_ENV = 'development';
    expect(run(new HttpException('upstream said no', 502), 'x').body.message).toBe('upstream said no');
    expect(run(new Error('secret detail'), 'x').body.message).toBe(GENERIC_SERVER_ERROR);
  });
});

describe('16.6 log masking', () => {
  it('masks phone, e-mail, national id and medical data under any key', () => {
    const out = JSON.stringify(maskPii({
      patient_phone: '0501234567', note: 'call +966 50 123 4567', contact: 'a@b.sa', nid: '1234567890', id_number: '1098765432',
      diagnosis: 'asthma', medication: 'insulin', allergies: ['penicillin'], lab_result: { hba1c: 9 }, symptoms: 'cough', dob: '1990-01-01',
      nested: { insurance_number: 'POL-1', iban: 'SA0380000000608010167519' },
    }));
    for (const leak of ['0501234567', '966 50', 'a@b.sa', '1234567890', '1098765432', 'asthma', 'insulin', 'penicillin', 'hba1c', 'cough', '1990-01-01', 'POL-1', 'SA03800']) {
      expect(out).not.toContain(leak);
    }
  });

  it('keeps operational fields readable', () => {
    expect(maskPii({ route: '/api/v1/health', status: 200, duration_ms: 12, event: 'http_request' })).toEqual({ route: '/api/v1/health', status: 200, duration_ms: 12, event: 'http_request' });
  });
});

describe('16.6 append-only audit log', () => {
  const schema = new Schema({ action: String });
  makeAppendOnly(schema, 'audit_logs');
  const Audit: Model<{ action?: string }> = model('A166', schema);

  it.each([
    ['updateOne', () => Audit.updateOne({}, { action: 'x' })],
    ['updateMany', () => Audit.updateMany({}, { action: 'x' })],
    ['findOneAndUpdate', () => Audit.findOneAndUpdate({}, { action: 'x' })],
    ['replaceOne', () => Audit.replaceOne({}, { action: 'x' })],
    ['deleteOne', () => Audit.deleteOne({})],
    ['deleteMany', () => Audit.deleteMany({})],
    ['findOneAndDelete', () => Audit.findOneAndDelete({})],
    ['bulkWrite update', () => Audit.bulkWrite([{ updateOne: { filter: {}, update: { action: 'x' } } }] as any)],
  ])('%s is refused', async (_n, op) => {
    await expect(Promise.resolve().then(op as () => Promise<unknown>)).rejects.toBeInstanceOf(AppendOnlyViolation);
  });

  it('saving a stored row again is refused, saving a new one is not', async () => {
    const stored = new Audit({ action: 'a' });
    stored.isNew = false;
    await expect(stored.save()).rejects.toBeInstanceOf(AppendOnlyViolation);
    await expect(new Audit({ action: 'b' }).validate()).resolves.toBeUndefined();
  });
});
