import 'reflect-metadata';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model } from 'mongoose';
import { JwtAuthGuard, ROLES_KEY } from '../../common/auth.guard';
import { PERMISSIONS_KEY, Permission, ROLE_PERMISSIONS } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { Article } from '../../schemas/article.schema';
import { PregnancyWeek } from '../../schemas/pregnancy-week.schema';
import { UpsertDto as CmsUpsertDto } from '../admin/enterprise/admin-cms.dto';
import { AdminAuditService } from '../admin/enterprise/audit.service';
import { MaternityContentController } from './maternity-content.controller';
import { MaternityService } from './maternity.service';
import { MaternityContentQueryDto, UpsertPregnancyWeekDto } from './pregnancy-weeks.dto';
import { PregnancyWeeksAdminController } from './pregnancy-weeks-admin.controller';
import { PregnancyWeeksService } from './pregnancy-weeks.service';

type Filter = Record<string, unknown>;
const chain = <T>(value: T) => {
  const q = { sort: jest.fn(() => q), limit: jest.fn(() => q), lean: jest.fn(async () => value) };
  return q;
};

function makeWeeks(stored: Array<Record<string, unknown>>, articles: Array<Record<string, unknown>>) {
  const weekModel = {
    findOne: jest.fn((filter: Filter) => {
      const week = (filter.week as { $eq: number }).$eq;
      return chain(stored.find((row) => row.week === week && (filter.published === undefined || row.published === filter.published)) ?? null);
    }),
    find: jest.fn(() => chain(stored)),
    findOneAndUpdate: jest.fn((_filter: Filter, update: { $set: Record<string, unknown>; $setOnInsert: Record<string, unknown> }) => chain({ ...update.$setOnInsert, ...update.$set })),
    deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
  };
  const articleModel = {
    find: jest.fn((filter: Filter) => chain(articles.filter((a) => a.pregnancy_week === (filter.pregnancy_week as { $eq: number }).$eq && a.status === filter.status))),
  };
  const audit = { write: jest.fn(async () => undefined) };
  const service = new PregnancyWeeksService(weekModel as unknown as Model<PregnancyWeek>, articleModel as unknown as Model<Article>, audit as unknown as AdminAuditService);
  return { service, weekModel, articleModel, audit };
}

const WEEK_12 = { id: 'w12', week: 12, size_ar: 'بحجم ثمرة الليمون', size_en: 'About the size of a lime', development_ar: 'نص تجريبي', development_en: '', image_url: 'https://cdn.nabd.plus/test/week-12.jpg', published: true, created_by: 'admin-1', updatedAt: new Date('2026-10-01T00:00:00Z') };
const ARTICLE = { id: 'a1', slug: 'week-12-reading', title_ar: 'قراءة الأسبوع', status: 'PUBLISHED', pregnancy_week: 12 };

describe('GET /maternity/content: the pregnancy week entry and "Read this week" (issues #849, #861)', () => {
  it('answers the published entry of the week and the published articles tagged with it, without audit fields', async () => {
    const { service, articleModel } = makeWeeks([WEEK_12], [ARTICLE, { ...ARTICLE, slug: 'draft', status: 'DRAFT' }, { ...ARTICLE, slug: 'other', pregnancy_week: 13 }]);
    const content = await service.contentFor(12);
    expect(content.week).toBe(12);
    expect(content.week_content).toEqual({ week: 12, size_ar: WEEK_12.size_ar, size_en: WEEK_12.size_en, development_ar: WEEK_12.development_ar, development_en: null, image_url: WEEK_12.image_url, updated_at: '2026-10-01T00:00:00.000Z' });
    expect(content.read_this_week.map((a) => a.slug)).toEqual(['week-12-reading']);
    expect(articleModel.find).toHaveBeenCalledWith(expect.objectContaining({ pregnancy_week: { $eq: 12 }, status: 'PUBLISHED', is_deleted: { $ne: true } }), expect.anything());
  });

  it('answers null for a week the admin has not filled or not published (no invented text)', async () => {
    const { service } = makeWeeks([{ ...WEEK_12, week: 20, published: false }], []);
    await expect(service.contentFor(20)).resolves.toEqual({ week: 20, week_content: null, read_this_week: [] });
    await expect(service.contentFor(30)).resolves.toEqual({ week: 30, week_content: null, read_this_week: [] });
  });

  it('answers an empty result when the reader has no pregnancy week', async () => {
    const { service, weekModel } = makeWeeks([WEEK_12], [ARTICLE]);
    await expect(service.contentFor(null)).resolves.toEqual({ week: null, week_content: null, read_this_week: [] });
    expect(weekModel.findOne).not.toHaveBeenCalled();
  });

  it('the controller reads the week of the reader\'s profile, and ?week= for another week', async () => {
    const { service } = makeWeeks([WEEK_12], [ARTICLE]);
    const spy = jest.spyOn(service, 'contentFor');
    const maternity = { getProfile: jest.fn(async () => ({ is_pregnant: true, current_week: 12 })) };
    const controller = new MaternityContentController(maternity as unknown as MaternityService, service);
    const req = { user: { id: 'patient-1' } };
    const mine = await controller.getContent(req, {});
    expect(maternity.getProfile).toHaveBeenCalledWith('patient-1');
    expect(mine.week_content?.size_ar).toBe(WEEK_12.size_ar);
    await controller.getContent(req, { week: 30 });
    expect(spy).toHaveBeenLastCalledWith(30);
    maternity.getProfile.mockResolvedValueOnce({ is_pregnant: false, current_week: 12 });
    await expect(controller.getContent(req, {})).resolves.toEqual({ week: null, week_content: null, read_this_week: [] });
    await expect(controller.getContent({}, {})).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('?week= accepts 1-42 only', async () => {
    const bad = await Promise.all(['0', '43', 'x', '1.5'].map((week) => validate(plainToInstance(MaternityContentQueryDto, { week }))));
    expect(bad.every((errors) => errors.length > 0)).toBe(true);
    const good = plainToInstance(MaternityContentQueryDto, { week: '42' });
    expect(await validate(good)).toEqual([]);
    expect(good.week).toBe(42);
  });
});

describe('admin pregnancy week catalogue', () => {
  const handlers = Object.getOwnPropertyNames(PregnancyWeeksAdminController.prototype).filter((name) => name !== 'constructor');

  it('every route is admin-only and needs cms.edit, like the other content routes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PregnancyWeeksAdminController)).toBe('admin/maternity/weeks');
    expect(Reflect.getMetadata(ROLES_KEY, PregnancyWeeksAdminController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(GUARDS_METADATA, PregnancyWeeksAdminController)).toContain(JwtAuthGuard);
    expect(handlers.sort()).toEqual(['list', 'one', 'remove', 'upsert']);
    for (const name of handlers) {
      const fn = (PregnancyWeeksAdminController.prototype as unknown as Record<string, () => unknown>)[name];
      expect(Reflect.getMetadata(METHOD_METADATA, fn)).toBeDefined();
      expect(Reflect.getMetadata(PERMISSIONS_KEY, fn)).toEqual([Permission.CMS_EDIT]);
    }
    expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toContain(Permission.CMS_EDIT);
  });

  it('the image is an https URL on the CDN; plain http, other hosts and missing texts are refused', async () => {
    const base = { size_ar: 'بحجم الليمونة', development_ar: 'نص', published: true, reason: 'تعبئة الأسبوع' };
    expect(await validate(plainToInstance(UpsertPregnancyWeekDto, { ...base, image_url: 'https://cdn.nabd.plus/weeks/12.jpg' }))).toEqual([]);
    expect(await validate(plainToInstance(UpsertPregnancyWeekDto, base))).toEqual([]);
    for (const image_url of ['http://cdn.nabd.plus/weeks/12.jpg', 'https://evil.example.com/12.jpg', 'cdn.nabd.plus/12.jpg']) {
      expect((await validate(plainToInstance(UpsertPregnancyWeekDto, { ...base, image_url }))).map((e) => e.property)).toEqual(['image_url']);
    }
    expect((await validate(plainToInstance(UpsertPregnancyWeekDto, { ...base, size_ar: '' }))).map((e) => e.property)).toEqual(['size_ar']);
    expect((await validate(plainToInstance(UpsertPregnancyWeekDto, { ...base, reason: '' }))).map((e) => e.property)).toEqual(['reason']);
  });

  it('upsert writes the week with audit fields, clears empty English texts and audits the reason', async () => {
    const { service, weekModel, audit } = makeWeeks([], []);
    const saved = await service.upsert('12', { size_ar: ' بحجم الليمونة ', size_en: '', development_ar: 'نص', published: true, image_url: 'https://cdn.nabd.plus/w/12.jpg', reason: 'تعبئة الأسبوع' }, { id: 'admin-1' });
    const [filter, update] = weekModel.findOneAndUpdate.mock.calls[0] as unknown as [Filter, { $set: Record<string, unknown>; $unset: Record<string, string>; $setOnInsert: Record<string, unknown> }];
    expect(filter).toEqual({ week: { $eq: 12 } });
    expect(update.$set).toEqual(expect.objectContaining({ size_ar: 'بحجم الليمونة', published: true, updated_by: 'admin-1', image_url: 'https://cdn.nabd.plus/w/12.jpg' }));
    expect(update.$set.published_at).toBeInstanceOf(Date);
    expect(update.$unset).toEqual({ size_en: '', development_en: '' });
    expect(update.$setOnInsert).toEqual(expect.objectContaining({ week: 12, created_by: 'admin-1' }));
    expect(saved.week).toBe(12);
    expect(audit.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'pregnancy_week_create', target_id: '12', reason: 'تعبئة الأسبوع' }));
  });

  it('refuses a week outside 1-42', async () => {
    const { service } = makeWeeks([], []);
    await expect(service.upsert('43', { size_ar: 'x', development_ar: 'y', published: false, reason: 'سبب كاف' }, { id: 'a' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.one('0')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('the admin article form can tag an article with a pregnancy week (1-42)', async () => {
    expect(await validate(plainToInstance(CmsUpsertDto, { title_ar: 'مقال', pregnancy_week: 12 }))).toEqual([]);
    expect(await validate(plainToInstance(CmsUpsertDto, { title_ar: 'مقال', pregnancy_week: null }))).toEqual([]);
    expect((await validate(plainToInstance(CmsUpsertDto, { title_ar: 'مقال', pregnancy_week: 50 }))).map((e) => e.property)).toEqual(['pregnancy_week']);
  });
});
