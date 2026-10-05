// 886e17f: the global filter mapped 404 to UNKNOWN_ERROR (STATUS_TO_CODE had
// no 404 entry; live /medicines/ranking-r9 and unknown routes) and dropped
// every extra field of an object error body (e.g. the workflow engine's
// { error, kind, domain_state }). 404 now maps to NOT_FOUND and the extra
// fields are kept under `details`.
import { ConflictException, Controller, Get, INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SentryExceptionFilter } from './sentry.filter';

@Controller('probe')
class ProbeController {
  @Get('missing') missing() { throw new NotFoundException(); }
  @Get('missing-msg') missingMsg() { throw new NotFoundException('medicine_not_found'); }
  @Get('conflict') conflict() { throw new ConflictException({ error: 'transition_not_allowed', kind: 'workflow', domain_state: 'COMPLETED' }); }
}

describe('global error filter over HTTP (886e17f)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = mod.createNestApplication({ logger: false });
    app.useGlobalFilters(new SentryExceptionFilter(app.getHttpAdapter()));
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('a thrown 404 has code NOT_FOUND', async () => {
    const res = await request(app.getHttpServer()).get('/probe/missing').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: 'Not Found' });
  });

  it('a 404 with a message keeps the message and has code NOT_FOUND', async () => {
    const res = await request(app.getHttpServer()).get('/probe/missing-msg').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: 'medicine_not_found' });
  });

  it('an unknown route has code NOT_FOUND', async () => {
    const res = await request(app.getHttpServer()).get('/no/such/route').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('extra fields of an object body are kept under details', async () => {
    const res = await request(app.getHttpServer()).get('/probe/conflict').expect(409);
    expect(res.body).toMatchObject({
      code: 'DUPLICATE_TRANSACTION',
      message: 'transition_not_allowed',
      details: { kind: 'workflow', domain_state: 'COMPLETED' },
    });
  });
});
