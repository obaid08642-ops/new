/**
 * D-1 (owner decision 1): community user posts are gone; doctors write articles that an admin
 * reviews before they become public. No comments on articles. Prescription-only brand names are
 * refused at submit and re-checked at approve.
 */
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { buildSlug, escapeRegex } from '../../common/slug.util';

export class SubmitDoctorArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title_ar!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title_en?: string;

  @IsString()
  @MinLength(1)
  body_ar!: string;

  @IsOptional()
  @IsString()
  body_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt_ar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class RejectDoctorArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}

@Injectable()
export class DoctorArticlesService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get profiles() {
    return this.conn.db.collection('provider_profiles');
  }

  private get articles() {
    return this.conn.db.collection('articles');
  }

  private get medicines() {
    return this.conn.db.collection('medicines');
  }

  /** An admin-approved doctor profile for this caller (medical review + verified licence). */
  async approvedDoctorProfile(userId: string): Promise<any | null> {
    if (!userId) return null;
    return this.profiles.findOne({
      type: 'doctor',
      status: 'active',
      medical_review_status: 'approved',
      license_verified: true,
      $or: [{ user_id: userId }, { account_id: userId }],
    });
  }

  /** Any doctor profile of this caller (used to list their own articles). */
  async ownDoctorProfile(userId: string): Promise<any | null> {
    if (!userId) return null;
    return this.profiles.findOne({ type: 'doctor', $or: [{ user_id: userId }, { account_id: userId }] });
  }

  /** Catalogue names of prescription-only medicines, in every stored language. */
  async prescriptionBrandNames(): Promise<string[]> {
    const rows = await this.medicines
      .find({ requires_prescription: true }, { projection: { name_ar: 1, name_en: 1, translations: 1 } })
      .toArray();
    const names = new Set<string>();
    for (const m of rows as any[]) {
      if (typeof m?.name_ar === 'string' && m.name_ar.trim()) names.add(m.name_ar.trim());
      if (typeof m?.name_en === 'string' && m.name_en.trim()) names.add(m.name_en.trim());
      const tr = (m as any)?.translations;
      if (tr && typeof tr === 'object') {
        for (const lang of Object.values(tr) as any[]) {
          if (lang && typeof lang?.name === 'string' && lang.name.trim()) names.add(lang.name.trim());
        }
      }
    }
    return [...names];
  }

  private mentions(haystack: string, name: string): boolean {
    if (/^[a-z0-9][a-z0-9\s-]*$/i.test(name)) {
      return new RegExp(`\\b${escapeRegex(name.toLowerCase())}\\b`, 'i').test(haystack);
    }
    return haystack.includes(name);
  }

  /** Throws 400 when the text names a prescription-only brand (any catalogue language). */
  async assertNoPrescriptionBrand(text: string): Promise<void> {
    const hay = String(text || '');
    if (!hay.trim()) return;
    for (const name of await this.prescriptionBrandNames()) {
      if (this.mentions(hay, name)) throw new BadRequestException('prescription_brand_not_allowed');
    }
  }

  async submit(userId: string, dto: SubmitDoctorArticleDto): Promise<any> {
    const profile = await this.approvedDoctorProfile(userId);
    if (!profile) throw new ForbiddenException('doctor_not_approved');
    const hay = [dto.title_ar, dto.title_en, dto.body_ar, dto.body_en, dto.excerpt_ar]
      .filter((v) => typeof v === 'string')
      .join('\n');
    await this.assertNoPrescriptionBrand(hay);
    const slug = buildSlug(dto.title_ar || dto.title_en || 'article', uuidv4());
    const doc: any = {
      id: uuidv4(),
      slug,
      title_ar: dto.title_ar,
      ...(dto.title_en !== undefined ? { title_en: dto.title_en } : {}),
      body_ar: dto.body_ar,
      ...(dto.body_en !== undefined ? { body_en: dto.body_en } : {}),
      excerpt_ar: dto.excerpt_ar ?? String(dto.body_ar).slice(0, 40),
      category: dto.category ?? 'general',
      tags: [],
      status: 'IN_REVIEW',
      author: { doctor_id: profile.id },
      views: 0,
      published_at: null,
      createdAt: new Date(),
    };
    await this.articles.insertOne(doc);
    const { _id, ...out } = doc;
    void _id;
    return out;
  }

  async mine(userId: string): Promise<any[]> {
    const profile = await this.ownDoctorProfile(userId);
    if (!profile) return [];
    return this.articles
      .find({ 'author.doctor_id': profile.id }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
  }

  async approve(id: string): Promise<any> {
    const article: any = await this.articles.findOne({ id });
    if (!article) throw new NotFoundException('article_not_found');
    if (article.status === 'PUBLISHED') return { ok: true, id, status: 'PUBLISHED' };
    // The catalogue may have changed while the article waited: re-check before it goes public.
    const hay = [article.title_ar, article.title_en, article.body_ar, article.body_en]
      .filter((v) => typeof v === 'string')
      .join('\n');
    await this.assertNoPrescriptionBrand(hay);
    await this.articles.updateOne({ id }, { $set: { status: 'PUBLISHED', published_at: new Date() } });
    return { ok: true, id, status: 'PUBLISHED' };
  }

  async reject(id: string, reason: string): Promise<any> {
    if (!String(reason || '').trim()) throw new BadRequestException('rejection_reason_required');
    const article: any = await this.articles.findOne({ id });
    if (!article) throw new NotFoundException('article_not_found');
    await this.articles.updateOne(
      { id },
      { $set: { status: 'REJECTED', rejection_reason: String(reason).trim(), rejected_at: new Date() } },
    );
    return { ok: true, id, status: 'REJECTED' };
  }
}

@Controller('doctor/articles')
@UseGuards(JwtAuthGuard)
export class DoctorArticlesController {
  constructor(private readonly svc: DoctorArticlesService) {}

  // The service admits only an admin-approved doctor profile of the caller (403 otherwise).
  @SelfService()
  @Post()
  submit(@CurrentUser() user: any, @Body() body: SubmitDoctorArticleDto) {
    return this.svc.submit(user?.id, body);
  }

  @Get()
  mine(@CurrentUser() user: any) {
    return this.svc.mine(user?.id);
  }
}
