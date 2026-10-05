// d576b7b: buildPlatformError / lookupError (the R5 error catalog) had no
// caller outside error-catalog.ts, so no error response carried the
// localized next step the catalog defines. The global filter now completes
// every catalog-code error with `error_code` and `nextStep` in the
// request's language, keeping the throw site's message.
import { Controller, Get, INestApplication, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SentryExceptionFilter } from './sentry.filter';
import MESSAGES from './errors.i18n.json';

@Controller('probe')
class ProbeController {
  @Get('auth') auth() { throw new UnauthorizedException('token_expired'); }
  @Get('slot') slot() { throw new ConflictException('slot_taken'); }
}

describe('error responses carry the catalog next step (d576b7b)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = mod.createNestApplication({ logger: false });
    app.useGlobalFilters(new SentryExceptionFilter(app.getHttpAdapter()));
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('Arabic request: catalog next step in Arabic, throw-site message kept', async () => {
    const res = await request(app.getHttpServer()).get('/probe/auth').set('Accept-Language', 'ar-SA,ar;q=0.9').expect(401);
    expect(res.body).toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      error_code: 'AUTHENTICATION_REQUIRED',
      message: 'token_expired',
      nextStep: MESSAGES.AUTHENTICATION_REQUIRED.ar.nextStep,
    });
  });

  it('other languages get the English next step', async () => {
    const res = await request(app.getHttpServer()).get('/probe/auth').expect(401);
    expect(res.body.nextStep).toBe(MESSAGES.AUTHENTICATION_REQUIRED.en.nextStep);
  });

  it('a non-catalog code (slot_taken) is left as it is', async () => {
    const res = await request(app.getHttpServer()).get('/probe/slot').expect(409);
    expect(res.body).toEqual({ code: 'slot_taken', message: 'slot_taken' });
  });
});
