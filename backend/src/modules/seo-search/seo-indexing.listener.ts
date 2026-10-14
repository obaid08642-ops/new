import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SeoIndexingService } from './seo-indexing.service';
import type { PublicEntityType } from './seo-public-urls';

/** catalog.publication.projected entity types → public page types. */
const PROJECTED: Record<string, PublicEntityType | 'provider'> = {
  medicine: 'medicine',
  provider: 'provider',
  facility: 'facility',
  lab_service: 'lab_service',
  radiology_service: 'radiology_service',
  home_care_service: 'home_care_service',
};

/** catalog.service_approved / _disabled `meta.kind` → public page types. */
const SERVICE_KINDS: Record<string, PublicEntityType> = {
  lab: 'lab_service',
  radiology: 'radiology_service',
  home_care: 'home_care_service',
};

/**
 * R24 + owner 2026-10-12: push-based index updates. Any medicine, lab test, radiology service,
 * nursing service, provider, facility, pharmacy or article that is added, changed or removed is
 * sent to IndexNow with its six localized URLs at once (SeoIndexingService).
 */
@Injectable()
export class SeoIndexingListener {
  constructor(private readonly indexing: SeoIndexingService) {}

  /** Every governed catalog decision (medicines, providers, facilities, labs, radiology, nursing). */
  @OnEvent('catalog.publication.projected')
  async onProjected(p: { entity_type?: string; entity_id?: string }) {
    const type = p?.entity_type ? PROJECTED[p.entity_type] : undefined;
    if (!type || !p.entity_id) return;
    if (type === 'provider') await this.indexing.notifyProvider(String(p.entity_id), 'catalog.publication.projected');
    else await this.indexing.notifyEntity(type, String(p.entity_id), 'catalog.publication.projected');
  }

  @OnEvent('catalog.service_approved')
  async onServiceApproved(p: { entity_id?: string; meta?: { kind?: string } }) {
    await this.service(p, 'catalog.service_approved');
  }

  @OnEvent('catalog.service_disabled')
  async onServiceDisabled(p: { entity_id?: string; meta?: { kind?: string } }) {
    await this.service(p, 'catalog.service_disabled');
  }

  private async service(p: { entity_id?: string; meta?: { kind?: string } } | undefined, reason: string) {
    const type = p?.meta?.kind ? SERVICE_KINDS[p.meta.kind] : undefined;
    if (type && p?.entity_id) await this.indexing.notifyEntity(type, String(p.entity_id), reason);
  }

  @OnEvent('radiology.catalog_delta')
  async onCatalogDelta(p: { id?: string; service_id?: string }) {
    const id = p?.id || p?.service_id;
    if (id) await this.indexing.notifyEntity('radiology_service', String(id), 'radiology.catalog_delta');
  }

  private async provider(p: { provider_id?: string } | undefined, reason: string) {
    if (p?.provider_id) await this.indexing.notifyProvider(String(p.provider_id), reason);
  }

  @OnEvent('provider.approved')
  async onApproved(p: { provider_id?: string }) { await this.provider(p, 'provider.approved'); }

  @OnEvent('provider.rejected')
  async onRejected(p: { provider_id?: string }) { await this.provider(p, 'provider.rejected'); }

  @OnEvent('provider.suspended')
  async onSuspended(p: { provider_id?: string }) { await this.provider(p, 'provider.suspended'); }

  @OnEvent('provider.changes_requested')
  async onChangesRequested(p: { provider_id?: string }) { await this.provider(p, 'provider.changes_requested'); }

  @OnEvent('admin.provider_approved')
  async onAdminApproved(p: { provider_id?: string }) { await this.provider(p, 'admin.provider_approved'); }

  @OnEvent('admin.provider_rejected')
  async onAdminRejected(p: { provider_id?: string }) { await this.provider(p, 'admin.provider_rejected'); }

  /** Article created, edited, published, unpublished or deleted (articles, doctor articles, admin CMS). */
  @OnEvent('article.changed')
  async onArticleChanged(p: { id?: string }) {
    if (p?.id) await this.indexing.notifyEntity('article', String(p.id), 'article.changed');
  }
}
