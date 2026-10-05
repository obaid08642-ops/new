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
import { NursingController } from '../../modules/home-care/home-care.controller';
import { LegalController } from '../../modules/legal/legal.module';
import { SeoSearchController } from '../../modules/seo-search/seo-search.module';

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

  it('per-viewer reads are never shared-cached', () => {
    // doctors/:id/slots hides the viewer's own hold; articles/:slug counts views.
    expect(Reflect.getMetadata(PUBLIC_CACHE_KEY, CareController.prototype.slots)).toBeUndefined();
    expect(Reflect.getMetadata(PUBLIC_CACHE_KEY, ArticlesPublicController.prototype.one)).toBeUndefined();
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
      ['labs packages/:id', LabsController.prototype.getPackageDetails],
      ['labs compatible-providers', LabsController.prototype.compatibleProviders],
      ['radiology compatible-providers', RadiologyController.prototype.compatibleProviders],
      ['care doctors', CareController.prototype.doctors],
      ['care doctors/:id', CareController.prototype.doctor],
      ['care search', CareController.prototype.search],
      ['care facilities', CareController.prototype.facilities],
      ['care facilities/:id', CareController.prototype.facility],
      ['home-care catalog', NursingController.prototype.getCatalog],
      ['legal policies', LegalController.prototype.list],
      ['legal policy/:key', LegalController.prototype.policy],
      ['seo organization', SeoSearchController.prototype.organization],
      ['seo local-business', SeoSearchController.prototype.localBusiness],
      ['seo faq', SeoSearchController.prototype.faqSchema],
      ['seo :type/:id', SeoSearchController.prototype.seo],
      ['seo hreflang', SeoSearchController.prototype.hreflang],
      ['search/global', SeoSearchController.prototype.globalSearch],
      ['medicine recommendations', SeoSearchController.prototype.medicineRecommendations],
      ['doctor recommendations', SeoSearchController.prototype.doctorRecommendations],
      ['public product', SeoSearchController.prototype.publicProduct],
      ['public products search', SeoSearchController.prototype.publicProductsSearch],
      ['public product-by-id', SeoSearchController.prototype.publicProductById],
      ['public by-sku', SeoSearchController.prototype.publicProductSku],
      ['public categories', SeoSearchController.prototype.publicCategories],
      ['public category items', SeoSearchController.prototype.publicCategoryProducts],
      ['public product sitemap', SeoSearchController.prototype.publicProductSitemap],
      ['public sitemap count', SeoSearchController.prototype.publicProductSitemapCount],
    ];
    const missing = routes.filter(([, fn]) => !Reflect.getMetadata(PUBLIC_CACHE_KEY, fn as object)).map(([n]) => n);
    expect(missing).toEqual([]);
  });
});
