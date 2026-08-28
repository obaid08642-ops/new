/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   LEGACY USAGE REPORT — read-only audit. Marks but does NOT    ║
 * ║   delete any collection. Output drives the cleanup roadmap.    ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Get, UseGuards, Injectable } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

/** Collections classified as "active canonical" vs "legacy duplicate". */
const LEGACY_MAP: Record<string, { canonical: string; reason: string }> = {
  pharmacy_orders: { canonical: 'orders', reason: 'broadcast engine pharmacy_orders runs alongside legacy orders; mapped via STATE_MAP.pharmacy' },
  pharmacy_allocations: { canonical: 'orders.state', reason: 'allocation events surface in order.state_history via WorkflowEngine' },
  pharmacy_broadcasts: { canonical: 'system_events', reason: 'broadcast lifecycle mirrored in service.* events' },
  // legacy duplicates of provider profile across modules
  provideraccountprofiles: { canonical: 'providerprofiles', reason: 'duplicate provider profile schema in /provider module' },
  provideraccounts: { canonical: 'users (with role=provider)', reason: 'duplicate of auth user accounts' },
};

@Injectable()
export class LegacyService {
  constructor(@InjectConnection() private conn: Connection) {}

  async report() {
    const db = this.conn.db;
    if (!db) return { error: 'no_db_connection' };
    const cols = await db.listCollections().toArray();
    const out: any[] = [];
    for (const c of cols) {
      const name = c.name;
      const count = await db.collection(name).estimatedDocumentCount().catch(() => 0);
      const legacy = LEGACY_MAP[name];
      out.push({
        collection: name,
        document_count: count,
        is_legacy: !!legacy,
        canonical: legacy?.canonical || null,
        reason: legacy?.reason || null,
      });
    }
    return {
      collections: out.sort((a, b) => Number(b.is_legacy) - Number(a.is_legacy) || b.document_count - a.document_count),
      legacy_total: out.filter(x => x.is_legacy).length,
      canonical_total: out.filter(x => !x.is_legacy).length,
      generated_at: new Date(),
    };
  }

  async usageMap() {
    // Static usage map of code paths that still reference legacy collections.
    return {
      pharmacy_orders: {
        canonical: 'orders',
        readers: ['unified-bookings.myTimeline', 'admin-command-center.liveBookings'],
        writers: ['pharmacy/services/pharmacy-order.service.ts', 'pharmacy/services/pharmacy-allocation.service.ts'],
        status: 'parallel_coexistence — engine bridges both via STATE_MAP',
      },
      pharmacy_allocations: {
        canonical: 'orders.state_history (via engine)',
        readers: ['pharmacy/services/pharmacy-allocation.service.ts'],
        writers: ['pharmacy/services/pharmacy-allocation.service.ts'],
        status: 'side_table — kept for granular split tracking',
      },
      pharmacy_broadcasts: {
        canonical: 'system_events (service.*)',
        readers: ['pharmacy/services/pharmacy-broadcast.service.ts'],
        writers: ['pharmacy/services/pharmacy-broadcast.service.ts'],
        status: 'side_table — kept for radius/round tracking',
      },
      provideraccountprofiles: {
        canonical: 'providerprofiles',
        readers: ['provider/services/*'],
        writers: ['provider/services/*'],
        status: 'duplicate_schema — slated for merge',
      },
    };
  }
}

@Controller('legacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class LegacyController {
  constructor(private svc: LegacyService) {}
  @Get('report') report() { return this.svc.report(); }
  @Get('usage-map') usageMap() { return this.svc.usageMap(); }
}

@Module({
  imports: [MongooseModule.forFeature([])],
  controllers: [LegacyController],
  providers: [LegacyService],
})
export class LegacyModule {}
