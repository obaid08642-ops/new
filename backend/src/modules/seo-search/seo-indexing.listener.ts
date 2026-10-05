import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SeoService } from './seo.service';
import { AutoEntitySeoPipelineService, PipelineEntityType } from '../events/auto-entity-seo-pipeline.service';

/**
 * R24: push-based index updates on entity lifecycle changes.
 * Sitemap routes are time-revalidated; this listener pings IndexNow
 * the moment providers/entities change state (approve/reject/suspend,
 * catalog deltas) instead of waiting for the next crawl window.
 *
 * 13.R6: provider lifecycle propagation — every provider status change
 * (approve/reject/suspend/reactivate/…) fans out to all four discovery
 * surfaces via existing hooks only (no new infrastructure):
 *  1. search  — SeoService.pingIndexNow (IndexNow push, doctor+facility).
 *  2. sitemap — pipeline.invalidateCaches drops `seo:sitemap:xml` (+ slug keys).
 *  3. cache   — same call drops `public:catalog:*` / `seo:resolve:*` / `seo:llms:txt`.
 *  4. MCP     — same call drops `mcp:entities:cache`.
 * Suspend/archive removes the provider from public reads (read-side gates in
 * seo.service publicQuery / mcp.service filters / pipeline isEligible already
 * exclude non-active); reactivate restores it on the next read once the stale
 * keys are gone. Every step is best-effort: handlers never throw.
 */
@Injectable()
export class SeoIndexingListener {
  private readonly logger = new Logger(SeoIndexingListener.name);

  /**
   * Provider-profile entity types of the SEO pipeline (all map to the
   * `provider_profiles` / `facilities` source collections). The status-change
   * payload carries no type, so every provider-ish type is invalidated —
   * each call is a few fire-and-forget Redis DELs via an existing hook.
   */
  private static readonly PROVIDER_PIPELINE_TYPES: PipelineEntityType[] = [
    'doctor',
    'pharmacy',
    'nursing',
    'hospital',
    'clinic',
    'lab',
    'radiology',
  ];

  constructor(
    private readonly seo: SeoService,
    private readonly pipeline: AutoEntitySeoPipelineService,
  ) {}

  private async ping(type: string, id: string | undefined, event: string) {
    if (!id) return;
    try {
      const out = await this.seo.pingIndexNow(type, String(id));
      if (out?.ok) this.logger.log(`indexnow ${event} ${type}:${id}`);
    } catch { /* best-effort telemetry */ }
  }

  /**
   * 13.R6: fan a provider status change out to search + sitemap + cache + MCP.
   * Returns silently when the payload carries no id (mirrors ping's contract).
   */
  private async propagate(p: { provider_id?: string; id?: string }, event: string) {
    const pid = p?.provider_id || (p as any)?.id;
    if (!pid) return;
    await this.ping('doctor', pid, event);
    await this.ping('facility', pid, event);
    for (const t of SeoIndexingListener.PROVIDER_PIPELINE_TYPES) {
      try {
        await this.pipeline.invalidateCaches(t, String(pid));
      } catch { /* best-effort invalidation */ }
    }
  }

  @OnEvent('provider.approved')
  async onApproved(p: { provider_id?: string }) {
    await this.propagate(p, 'provider.approved');
  }

  @OnEvent('provider.rejected')
  async onRejected(p: { provider_id?: string }) {
    await this.propagate(p, 'provider.rejected');
  }

  @OnEvent('provider.suspended')
  async onSuspended(p: { provider_id?: string }) {
    await this.propagate(p, 'provider.suspended');
  }

  /**
   * 13.R6: reactivation restores the provider to search/sitemap/cache/MCP.
   * Emitted by ProviderAdminService.reactivate once per restored profile.
   */
  @OnEvent('provider.reactivated')
  async onReactivated(p: { provider_id?: string }) {
    await this.propagate(p, 'provider.reactivated');
  }

  @OnEvent('admin.provider_approved')
  async onAdminApproved(p: { provider_id?: string }) {
    await this.propagate(p, 'admin.provider_approved');
  }

  @OnEvent('admin.provider_rejected')
  async onAdminRejected(p: { provider_id?: string }) {
    await this.propagate(p, 'admin.provider_rejected');
  }

  @OnEvent('radiology.catalog_delta')
  async onCatalogDelta(p: { id?: string; service_id?: string }) {
    await this.ping('lab-service', p?.id || p?.service_id, 'radiology.catalog_delta');
  }
}
