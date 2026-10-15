import { Controller, Get, INestApplication, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listLimitMiddleware, stripLineSeparators } from './list-limit.middleware';

/**
 * Fuzz finding (GET /labs/services, 500): U+2028/U+2029 in a search value reached `new RegExp(...)`, whose source
 * then holds ` `, which MongoDB's PCRE2 rejects. The query middleware turns them into spaces first.
 */
describe('query line separators', () => {
  it('replaces encoded and raw U+2028 / U+2029 in the query, and nothing else', () => {
    expect(stripLineSeparators('/x?search=f%E2%80%A8g%e2%80%a9h')).toBe('/x?search=f%20g%20h');
    expect(stripLineSeparators('/x?search=a b')).toBe('/x?search=a%20b');
    expect(stripLineSeparators('/x?search=%D8%A8%D9%86%D8%AF%D9%88%D9%84')).toBe('/x?search=%D8%A8%D9%86%D8%AF%D9%88%D9%84');
    expect(stripLineSeparators('/x/%E2%80%A8')).toBe('/x/%E2%80%A8');
  });

  it('a search route builds a regex MongoDB accepts', async () => {
    @Controller('probe')
    class Probe {
      @Get() list(@Query('search') search = '') {
        const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return { source: re.source };
      }
    }
    const mod = await Test.createTestingModule({ controllers: [Probe] }).compile();
    const app: INestApplication = mod.createNestApplication();
    app.use(listLimitMiddleware);
    await app.init();
    const res = await request(app.getHttpServer()).get('/probe?search=a%0Ab%E2%80%A8g%E2%80%A9h');
    expect(res.body.source).not.toMatch(/\\u/);
    expect(res.body.source).toBe('a\\nb g h');
    await app.close();
  });
});
