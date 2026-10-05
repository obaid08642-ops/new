import { Controller, Get, Param, NotFoundException, ForbiddenException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Public } from '../../common/auth.guard';
import { isProviderRole } from '../../common/enums';

/** Canonical public website (same origin the public feeds advertise). */
const SITE_ORIGIN = 'https://nabd.plus';

/**
 * R17: provider types that have a public profile page on the website, keyed
 * to the page path. Only doctors are served from provider_profiles today
 * (patient-web /[locale]/doctor/[slug] via the entity graph).
 */
const PUBLIC_PROFILE_PATH: Record<string, string> = { doctor: '/ar/doctor/' };

export type WebsiteBadgeReason = 'not_active' | 'medical_review_not_approved' | 'not_public' | 'no_public_profile_page';

export interface WebsiteBadge {
  verified: boolean;
  reasons: WebsiteBadgeReason[];
  provider_type: string | null;
  profile_url: string | null;
  name_ar: string | null;
  name_en: string | null;
}

type ProfileRow = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * The verified gate for the website badge: status 'active' AND
 * medical_review_status 'approved' AND public_eligibility true, plus a public
 * profile page to link to. Each missing condition is reported so the provider
 * app can explain why there is no badge.
 */
export function websiteBadgeFor(profile: ProfileRow): WebsiteBadge {
  const reasons: WebsiteBadgeReason[] = [];
  if (profile.status !== 'active') reasons.push('not_active');
  if (profile.medical_review_status !== 'approved') reasons.push('medical_review_not_approved');
  if (profile.public_eligibility !== true) reasons.push('not_public');
  const type = text(profile.type);
  const slug = text(profile.slug);
  const path = type ? PUBLIC_PROFILE_PATH[type] : undefined;
  if (!reasons.length && (!path || !slug)) reasons.push('no_public_profile_page');
  const verified = reasons.length === 0;
  return {
    verified,
    reasons,
    provider_type: type,
    profile_url: verified && path && slug ? `${SITE_ORIGIN}${path}${encodeURIComponent(slug)}` : null,
    name_ar: text(profile.display_name_ar) ?? text(profile.name_ar),
    name_en: text(profile.display_name_en) ?? text(profile.name_en),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Provider embed badge (organic backlink engine).
 * Public endpoint returning a copy-paste dofollow anchor snippet pointing
 * at the provider's canonical page. ONLY active/approved/public providers with
 * a public profile page get a badge — anything else returns 404 (never
 * advertise unverified providers).
 */
@Controller('providers')
export class ProviderBadgeController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get(':id/badge')
  async badge(@Param('id') id: string) {
    const p: ProfileRow | null = await this.conn.collection('provider_profiles').findOne({
      $or: [{ id }, { account_id: id }, { slug: id }],
      status: 'active', public_eligibility: true, medical_review_status: 'approved',
    } as never);
    if (!p) throw new NotFoundException('badge_not_available');
    const badge = websiteBadgeFor(p);
    if (!badge.verified || !badge.profile_url) throw new NotFoundException('badge_not_available');
    const name = badge.name_ar || badge.name_en || 'مقدم خدمة معتمد';
    const html = `<a href="${badge.profile_url}" rel="dofollow" title="${escapeHtml(name)} — نبض بلس">${escapeHtml(`مزود معتمد على نبض بلس — ${name}`)}</a>`;
    return {
      provider_id: p.id,
      canonical_url: badge.profile_url,
      badge_text_ar: `مزود معتمد على نبض بلس — ${name}`,
      badge_text_en: `Verified provider on Nabd Plus — ${badge.name_en || name}`,
      embed_html: html,
    };
  }
}

/** R17: the signed-in provider's own website-badge status (provider-app "Website badge" tab). */
@Controller('provider')
@UseGuards(JwtAuthGuard)
export class ProviderWebsiteBadgeController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get('website-badge')
  async mine(@CurrentUser() user: { id: string; role: string }): Promise<WebsiteBadge> {
    if (!isProviderRole(user?.role)) throw new ForbiddenException('provider scope required');
    const p: ProfileRow | null = await this.conn.collection('provider_profiles').findOne({
      $or: [{ user_id: user.id }, { account_id: user.id }],
    } as never);
    if (!p) throw new NotFoundException('profile_not_found');
    return websiteBadgeFor(p);
  }
}
