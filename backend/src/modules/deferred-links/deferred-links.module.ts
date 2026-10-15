/**
 * P13-R18: nabd:// fallback and deferred deep links.
 *
 * A signed-in user shares a published entity; the backend mints a short link
 * id. Anyone opening it (web universal link, or the app after a fresh
 * install) resolves it to the entity plus the client-verified routes
 * (patient-app webLinkMap, patient-web pages). Links are single-use and
 * expire after 30 days; unpublished entities never mint or resolve.
 */
import { BadRequestException, Body, Controller, Get, GoneException, Injectable, Module, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { IsDefined, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard, NoGuestsGuard, CurrentUser, Public } from '../../common/auth.guard';

export const DEFERRED_ENTITY_TYPES = ['medicine', 'doctor', 'facility', 'article'] as const;
export type DeferredEntityType = (typeof DEFERRED_ENTITY_TYPES)[number];

const SOURCE_COLLECTION: Record<DeferredEntityType, string> = {
  medicine: 'medicines',
  doctor: 'provider_profiles',
  facility: 'facilities',
  article: 'articles',
};

/** Verified client routes (patient-app webLinkMap + patient-web pages). */
function clientTargets(type: DeferredEntityType, slug: string) {
  const seg = encodeURIComponent(slug);
  switch (type) {
    case 'medicine':
      return { web_path: `/p/${seg}`, app_route: `/p/${seg}` };
    case 'doctor':
      return { web_path: `/doctor/${seg}`, app_route: `/doctor/${seg}` };
    case 'facility':
      return { web_path: `/facility/${seg}`, app_route: `/facility/${seg}` };
    case 'article':
      return { web_path: `/articles/${seg}`, app_route: `/articles/${seg}` };
  }
}

const LINK_TTL_MS = 30 * 86400000;
const DAILY_CAP = 50;

export class CreateDeferredLinkDto {
  @IsDefined()
  @IsIn(['medicine', 'doctor', 'facility', 'article'])
  entity_type!: DeferredEntityType;

  /** Catalogue id or slug — resolved server-side, never trusted as a path. */
  @IsDefined()
  @IsString()
  @MaxLength(120)
  entity_ref!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  ttl_days?: number;
}

@Injectable()
export class DeferredLinksService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private links() { return this.conn.collection('deferred_links'); }

  async create(user: any, body: CreateDeferredLinkDto) {
    if (!user?.id) throw new BadRequestException('login_required');
    const type = body?.entity_type;
    if (!(DEFERRED_ENTITY_TYPES as readonly string[]).includes(String(type))) {
      throw new BadRequestException('invalid_entity_type');
    }
    const ref = String(body?.entity_ref || '').slice(0, 120);
    if (!ref) throw new BadRequestException('entity_ref_required');
    // Anti-abuse: bounded links per user per day.
    const dayAgo = new Date(Date.now() - 86400000);
    const made = await this.links().countDocuments({ created_by: user.id, created_at: { $gte: dayAgo } });
    if (made >= DAILY_CAP) throw new BadRequestException('too_many_links');

    const source: any = await this.conn.collection(SOURCE_COLLECTION[type]).findOne({
      $or: [{ id: ref }, { slug: ref }],
    });
    if (!source?.slug) throw new BadRequestException('entity_has_no_public_page');
    // Only published entities are shareable (suspended/unreviewed stay dark).
    const governed = type === 'article'
      ? source.status === 'PUBLISHED' && source.is_deleted !== true
      : await this.projectionPublished(type, String(source.id ?? ref));
    if (!governed) throw new BadRequestException('not_public');

    const id = randomUUID().replace(/-/g, '').slice(0, 12);
    const targets = clientTargets(type, String(source.slug))!;
    const now = new Date();
    const ttlDays = Math.min(30, Math.max(1, Number(body?.ttl_days) || 30));
    const doc = {
      id,
      entity_type: type,
      entity_id: String(source.id ?? ref),
      slug: String(source.slug),
      ...targets,
      universal_url: `https://nabd.plus${targets.web_path}`,
      app_url: `nabdplus://${targets.app_route.replace(/^\//, '')}`,
      created_by: user.id,
      created_at: now,
      expires_at: new Date(now.getTime() + ttlDays * 86400000),
      consumed_at: null,
      use_count: 0,
    };
    await this.links().insertOne(doc);
    const { _id, ...out } = doc as any;
    return out;
  }

  private async projectionPublished(type: DeferredEntityType, entityId: string): Promise<boolean> {
    try {
      const proj: any = await this.conn.collection('public_catalog_projections').findOne({
        entity_type: type === 'doctor' ? 'provider' : type,
        entity_id: entityId,
      });
      return proj?.published === true;
    } catch {
      return false;
    }
  }

  async resolve(id: string) {
    const link: any = await this.links().findOne({ id: String(id || '').slice(0, 64) });
    if (!link) throw new NotFoundException('link_not_found');
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      throw new GoneException('link_expired');
    }
    if (link.consumed_at) throw new GoneException('link_used');
    // Revalidate at open time: unpublished since minting stays dark.
    const stillPublic = link.entity_type === 'article'
      ? await this.articlePublic(link.entity_id)
      : await this.projectionPublished(link.entity_type, link.entity_id);
    if (!stillPublic) throw new GoneException('link_unpublished');
    await this.links().updateOne(
      { id: link.id, consumed_at: null },
      { $set: { consumed_at: new Date() }, $inc: { use_count: 1 } },
    );
    const { _id, ...out } = link;
    return { ...out, consumed_at: new Date() };
  }

  private async articlePublic(entityId: string): Promise<boolean> {
    try {
      const a: any = await this.conn.collection('articles').findOne({ id: entityId });
      return a?.status === 'PUBLISHED' && a?.is_deleted !== true;
    } catch {
      return false;
    }
  }
}

@Controller('share/links')
export class DeferredLinksController {
  constructor(private readonly svc: DeferredLinksService) {}

  /** Mint a deferred link (any signed-in, non-guest user; guests cannot share). */
  @Post()
  @UseGuards(JwtAuthGuard, NoGuestsGuard)
  create(@CurrentUser() user: any, @Body() body: CreateDeferredLinkDto) {
    return this.svc.create(user, body);
  }

  /**
   * Resolve + consume a link. Public (the id is the capability, like a share
   * URL): a fresh install with no account opens the originally requested
   * entity exactly once.
   */
  @Get(':id')
  @Public()
  resolve(@Param('id') id: string) {
    return this.svc.resolve(id);
  }
}

@Module({
  controllers: [DeferredLinksController],
  providers: [DeferredLinksService],
  exports: [DeferredLinksService],
})
export class DeferredLinksModule {}
