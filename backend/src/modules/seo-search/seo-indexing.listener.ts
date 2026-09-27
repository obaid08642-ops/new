import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SeoService } from './seo.service';

/**
 * R24: push-based index updates on entity lifecycle changes.
 * Sitemap routes are time-revalidated; this listener pings IndexNow
 * the moment providers/entities change state (approve/reject/suspend,
 * catalog deltas) instead of waiting for the next crawl window.
 */
@Injectable()
export class SeoIndexingListener {
  private readonly logger = new Logger(SeoIndexingListener.name);

  constructor(private readonly seo: SeoService) {}

  private async ping(type: string, id: string | undefined, event: string) {
    if (!id) return;
    try {
      const out = await this.seo.pingIndexNow(type, String(id));
      if (out?.ok) this.logger.log(`indexnow ${event} ${type}:${id}`);
    } catch { /* best-effort telemetry */ }
  }

  @OnEvent('provider.approved')
  async onApproved(p: { provider_id?: string }) {
    await this.ping('doctor', p?.provider_id, 'provider.approved');
    await this.ping('facility', p?.provider_id, 'provider.approved');
  }

  @OnEvent('provider.rejected')
  async onRejected(p: { provider_id?: string }) {
    await this.ping('doctor', p?.provider_id, 'provider.rejected');
    await this.ping('facility', p?.provider_id, 'provider.rejected');
  }

  @OnEvent('provider.suspended')
  async onSuspended(p: { provider_id?: string }) {
    await this.ping('doctor', p?.provider_id, 'provider.suspended');
    await this.ping('facility', p?.provider_id, 'provider.suspended');
  }

  @OnEvent('admin.provider_approved')
  async onAdminApproved(p: { provider_id?: string }) {
    await this.ping('doctor', p?.provider_id, 'admin.provider_approved');
    await this.ping('facility', p?.provider_id, 'admin.provider_approved');
  }

  @OnEvent('admin.provider_rejected')
  async onAdminRejected(p: { provider_id?: string }) {
    await this.ping('doctor', p?.provider_id, 'admin.provider_rejected');
    await this.ping('facility', p?.provider_id, 'admin.provider_rejected');
  }

  @OnEvent('radiology.catalog_delta')
  async onCatalogDelta(p: { id?: string; service_id?: string }) {
    await this.ping('lab-service', p?.id || p?.service_id, 'radiology.catalog_delta');
  }
}
