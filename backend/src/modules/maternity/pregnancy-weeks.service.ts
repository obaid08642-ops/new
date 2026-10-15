import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { Article } from '../../schemas/article.schema';
import { PregnancyWeek } from '../../schemas/pregnancy-week.schema';
import { AdminAuditService } from '../admin/enterprise/audit.service';
import { UpsertPregnancyWeekDto } from './pregnancy-weeks.dto';

export const FIRST_WEEK = 1;
export const LAST_WEEK = 42;
const READ_THIS_WEEK_LIMIT = 10;

/** The week entry the patient app and website draw (no audit fields). */
export interface PregnancyWeekContent {
  week: number;
  size_ar: string;
  size_en: string | null;
  development_ar: string;
  development_en: string | null;
  image_url: string | null;
  updated_at: string | null;
}

/** One published article of "Read this week": the fields a list row and its link to /articles/:slug need. */
export interface WeekArticle {
  id?: string;
  slug: string;
  title_ar?: string;
  title_en?: string;
  excerpt_ar?: string;
  excerpt_en?: string;
  cover_image?: string;
  category?: string;
  published_at?: Date;
}

export interface MaternityContent {
  week: number | null;
  week_content: PregnancyWeekContent | null;
  read_this_week: WeekArticle[];
}

type WeekRow = PregnancyWeek & { updatedAt?: Date; createdAt?: Date };
type Actor = { id?: string; full_name?: string; email?: string; role?: string };

const ARTICLE_FIELDS = { _id: 0, id: 1, slug: 1, title_ar: 1, title_en: 1, excerpt_ar: 1, excerpt_en: 1, cover_image: 1, category: 1, published_at: 1 };
const text = (value: string | undefined): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

export function weekInRange(value: unknown): number {
  const week = Number(value);
  if (!Number.isInteger(week) || week < FIRST_WEEK || week > LAST_WEEK) throw new BadRequestException(`week must be an integer between ${FIRST_WEEK} and ${LAST_WEEK}`);
  return week;
}

/**
 * Issues #849 / #861: the admin-managed pregnancy week catalogue and "Read this week" (published articles the admin tagged with
 * that pregnancy week). Nothing is invented: an unfilled or unpublished week answers week_content = null.
 */
@Injectable()
export class PregnancyWeeksService {
  constructor(
    @InjectModel(PregnancyWeek.name) private readonly weeks: Model<PregnancyWeek>,
    @InjectModel(Article.name) private readonly articles: Model<Article>,
    @Optional() private readonly audit?: AdminAuditService,
  ) {}

  private static publicEntry(row: WeekRow): PregnancyWeekContent {
    return {
      week: row.week,
      size_ar: row.size_ar,
      size_en: text(row.size_en),
      development_ar: row.development_ar,
      development_en: text(row.development_en),
      image_url: text(row.image_url),
      updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }

  /** GET /maternity/content: the published entry of `week` and its published articles; `null` week (no pregnancy) answers empty. */
  async contentFor(week: number | null): Promise<MaternityContent> {
    if (week === null) return { week: null, week_content: null, read_this_week: [] };
    const [entry, articles] = await Promise.all([
      this.weeks.findOne({ week: { $eq: week }, published: true }, { _id: 0, __v: 0 }).lean<WeekRow | null>(),
      this.articles
        .find({ pregnancy_week: { $eq: week }, status: 'PUBLISHED', is_deleted: { $ne: true } }, ARTICLE_FIELDS)
        .sort({ published_at: -1 })
        .limit(READ_THIS_WEEK_LIMIT)
        .lean<WeekArticle[]>(),
    ]);
    return { week, week_content: entry ? PregnancyWeeksService.publicEntry(entry) : null, read_this_week: (articles || []).filter((a) => typeof a?.slug === 'string' && a.slug.length > 0) };
  }

  /** Admin list: every entry the admin has written (published or not), by week. */
  list(): Promise<WeekRow[]> {
    return this.weeks.find({}, { _id: 0, __v: 0 }).sort({ week: 1 }).lean<WeekRow[]>();
  }

  async one(weekParam: unknown): Promise<WeekRow> {
    const week = weekInRange(weekParam);
    const row = await this.weeks.findOne({ week: { $eq: week } }, { _id: 0, __v: 0 }).lean<WeekRow | null>();
    if (!row) throw new NotFoundException('pregnancy_week_not_found');
    return row;
  }

  async upsert(weekParam: unknown, dto: UpsertPregnancyWeekDto, actor: Actor): Promise<WeekRow> {
    const week = weekInRange(weekParam);
    const before = await this.weeks.findOne({ week: { $eq: week } }, { _id: 0, __v: 0 }).lean<WeekRow | null>();
    const $set: Record<string, unknown> = {
      size_ar: dto.size_ar.trim(),
      development_ar: dto.development_ar.trim(),
      published: dto.published,
      updated_by: actor?.id,
    };
    const $unset: Record<string, ''> = {};
    for (const key of ['size_en', 'development_en', 'image_url'] as const) {
      const value = text(dto[key]);
      if (value) $set[key] = value;
      else $unset[key] = '';
    }
    if (dto.published && !before?.published) $set.published_at = new Date();
    if (!$set.size_ar || !$set.development_ar) throw new BadRequestException('size_ar_and_development_ar_required');
    const update: Record<string, unknown> = { $set, $setOnInsert: { id: randomUUID(), week, created_by: actor?.id } };
    if (Object.keys($unset).length) update.$unset = $unset;
    const saved = await this.weeks.findOneAndUpdate({ week: { $eq: week } }, update, { upsert: true, new: true, projection: { _id: 0, __v: 0 } }).lean<WeekRow | null>();
    await this.audit?.write({
      action: before ? 'pregnancy_week_update' : 'pregnancy_week_create',
      actor,
      target_type: 'pregnancy_week',
      target_id: String(week),
      reason: dto.reason.trim(),
      before: before ? { published: before.published, size_ar: before.size_ar, image_url: before.image_url ?? null } : null,
      after: { published: dto.published, size_ar: $set.size_ar, image_url: $set.image_url ?? null },
    });
    if (!saved) throw new NotFoundException('pregnancy_week_not_found');
    return saved;
  }

  async remove(weekParam: unknown, reason: string, actor: Actor): Promise<{ ok: true; week: number }> {
    const week = weekInRange(weekParam);
    const before = await this.weeks.findOne({ week: { $eq: week } }, { _id: 0, __v: 0 }).lean<WeekRow | null>();
    if (!before) throw new NotFoundException('pregnancy_week_not_found');
    await this.weeks.deleteOne({ week: { $eq: week } });
    await this.audit?.write({ action: 'pregnancy_week_delete', actor, target_type: 'pregnancy_week', target_id: String(week), reason: reason.trim(), before: { published: before.published, size_ar: before.size_ar } });
    return { ok: true, week };
  }
}
