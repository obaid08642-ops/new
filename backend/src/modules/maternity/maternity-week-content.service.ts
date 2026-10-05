import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Read-only weekly pregnancy content (fetus image, size comparison, length, weight, text).
 *
 * Content is clinical education: it is served only from rows a reviewed content workflow
 * published in `maternity_week_content`. Nothing is generated or filled in here; a week with
 * no published row returns `available: false` so the app shows its empty state.
 *
 * Images live on R2 under `maternity/fetus/week-<NN>@<1|2|3>x.webp` and are linked only when
 * the row says the image was uploaded (`has_image: true`) and a public base URL is configured.
 */
export const MATERNITY_WEEK_COLLECTION = 'maternity_week_content';
export const FETUS_IMAGE_PREFIX = 'maternity/fetus';
export const MIN_WEEK = 1;
export const MAX_WEEK = 42;

export type LocalizedText = { ar: string | null; en: string | null };

export type WeekContent =
  | { week: number; available: false }
  | {
      week: number;
      available: true;
      size_label: LocalizedText;
      length_cm: number | null;
      weight_g: number | null;
      text: LocalizedText;
      image: { '1x': string; '2x': string; '3x': string } | null;
      reviewed_at: string | null;
      updated_at: string | null;
    };

type WeekRow = {
  week?: unknown;
  status?: unknown;
  size_label?: unknown;
  length_cm?: unknown;
  weight_g?: unknown;
  text?: unknown;
  has_image?: unknown;
  reviewed_at?: unknown;
  updated_at?: unknown;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim().length > 0 ? v : null);
const localized = (v: unknown): LocalizedText => {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return { ar: str(o.ar), en: str(o.en) };
};
const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const iso = (v: unknown): string | null => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === 'string' && !Number.isNaN(new Date(v).getTime())) return new Date(v).toISOString();
  return null;
};

export function parseWeek(raw: string): number {
  const week = /^\d{1,2}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(week) || week < MIN_WEEK || week > MAX_WEEK) {
    throw new BadRequestException(`week must be an integer between ${MIN_WEEK} and ${MAX_WEEK}`);
  }
  return week;
}

export function fetusImageUrls(week: number, publicBase: string | undefined): { '1x': string; '2x': string; '3x': string } | null {
  const base = str(publicBase)?.replace(/\/+$/, '');
  if (!base || !/^https:\/\//i.test(base)) return null;
  const key = (scale: number) => `${base}/${FETUS_IMAGE_PREFIX}/week-${String(week).padStart(2, '0')}@${scale}x.webp`;
  return { '1x': key(1), '2x': key(2), '3x': key(3) };
}

@Injectable()
export class MaternityWeekContentService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async getWeek(week: number): Promise<WeekContent> {
    const row = (await this.conn
      .collection(MATERNITY_WEEK_COLLECTION)
      .findOne({ week, status: 'published' }, { projection: { _id: 0 } })) as WeekRow | null;
    if (!row) return { week, available: false };
    const text = localized(row.text);
    if (!text.ar && !text.en) return { week, available: false };
    return {
      week,
      available: true,
      size_label: localized(row.size_label),
      length_cm: positive(row.length_cm),
      weight_g: positive(row.weight_g),
      text,
      image: row.has_image === true ? fetusImageUrls(week, process.env.S3_PUBLIC_BASE_URL) : null,
      reviewed_at: iso(row.reviewed_at),
      updated_at: iso(row.updated_at),
    };
  }
}
