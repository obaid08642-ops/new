// 5d1528c: @PublicCache was carried by no route, so every public catalogue read
// was sent as `private, no-store`, and `stale-if-error` was never emitted.
// Anonymous GETs of the public catalogue reads are now shared-cacheable with
// stale-if-error; a caller with credentials, and every error response, still
// gets `private, no-store`.
import { Controller, Get, INestApplication, NotFoundException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RouteCachePolicyInterceptor } from './route-cache-policy.interceptor';
import { PUBLIC_CACHE_KEY, PublicCache } from './public-cache.decorator';
import { Public } from '../auth.guard';
import { LocationController } from '../../modules/location/location.controller';
import { LocationService } from '../../modules/location/location.service';
import { CareController, PublicSpecialtiesController } from '../../modules/care/care.controller';
import { LabsController } from '../../modules/labs/labs.controller';
import { RadiologyController } from '../../modules/radiology/radiology.controller';
import { ArticlesPublicController } from '../../modules/articles/articles.module';

@Controller('probe')
class ErrorProbeController {
  @Public() @PublicCache(300, ['probe']) @Get('missing')
  missing() { throw new NotFoundException('gone'); }
}

describe('public catalogue reads are shared-cacheable (5d1528c)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [LocationController, ErrorProbeController],
      providers: [
        { provide: LocationService, useValue: { getRegions: async () => [{ code: 'riyadh' }] } },
        { provide: APP_INTERCEPTOR, useClass: RouteCachePolicyInterceptor },
      ],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('an anonymous GET /locations/regions is public with stale-if-error', async () => {
    const res = await request(app.getHttpServer()).get('/locations/regions').expect(200);
    expect(res.headers['cache-control']).toMatch(/^public, max-age=\d+, s-maxage=\d+, stale-while-revalidate=60, stale-if-error=86400$/);
    expect(res.headers['cache-tag']).toBe('geo');
  });

  it('the same read with a bearer token stays private', async () => {
    const res = await request(app.getHttpServer()).get('/locations/regions').set('Authorization', 'Bearer x').expect(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('an error response from a cacheable route is private, no-store', async () => {
    const res = await request(app.getHttpServer()).get('/probe/missing').expect(404);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('every listed public catalogue read carries @PublicCache', () => {
    const routes: Array<[string, unknown]> = [
      ['locations regions', LocationController.prototype.getRegions],
      ['locations cities', LocationController.prototype.getCities],
      ['locations districts', LocationController.prototype.getDistricts],
      ['locations :code', LocationController.prototype.getByCode],
      ['care specialties', CareController.prototype.specialties],
      ['care insurance', CareController.prototype.insuranceCompanies],
      ['care degrees', CareController.prototype.degrees],
      ['public specialties', PublicSpecialtiesController.prototype.specialties],
      ['labs services', LabsController.prototype.services],
      ['labs packages', LabsController.prototype.packages],
      ['labs categories', LabsController.prototype.categories],
      ['labs services/:id', LabsController.prototype.one],
      ['radiology services', RadiologyController.prototype.services],
      ['radiology modalities', RadiologyController.prototype.modalities],
      ['radiology services/:id', RadiologyController.prototype.one],
      ['articles list', ArticlesPublicController.prototype.list],
      ['articles categories', ArticlesPublicController.prototype.cats],
    ];
    const missing = routes.filter(([, fn]) => !Reflect.getMetadata(PUBLIC_CACHE_KEY, fn as object)).map(([n]) => n);
    expect(missing).toEqual([]);
  });
});
