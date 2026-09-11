import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/auth.guard';

/**
 * Provider embed badge (organic backlink engine).
 * Public endpoint returning a copy-paste dofollow anchor snippet pointing
 * at the provider's canonical page. ONLY active/approved providers get a
 * badge — suspended/pending providers return 404 (status-gated per §19,
 * never advertise unverified providers).
 */
@Controller('providers')
export class ProviderBadgeController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get(':id/badge')
  async badge(@Param('id') id: string) {
    const p: any = await this.conn.collection('provider_profiles').findOne({
      $or: [{ id }, { account_id: id }, { slug: id }],
    } as any);
    if (!p || p.status !== 'active') throw new NotFoundException('badge_not_available');
    const slug = p.slug || p.id;
    const url = `https://www.nabd.plus/ar/doctor/${encodeURIComponent(slug)}`;
    const name = p.display_name_ar || p.name_ar || p.name_en || 'مقدم خدمة معتمد';
    const html =
      `<a href="${url}" rel="dofollow" title="${name} — نبض بلس">` +
      `<img src="https://www.nabd.plus/badge-verified.svg" alt="مزود معتمد على نبض بلس" width="180" height="60" />` +
      `</a>`;
    return {
      provider_id: p.id,
      canonical_url: url,
      badge_text_ar: `مزود معتمد على نبض بلس — ${name}`,
      badge_text_en: `Verified provider on Nabd Plus — ${p.display_name_en || p.name_en || name}`,
      embed_html: html,
    };
  }
}
