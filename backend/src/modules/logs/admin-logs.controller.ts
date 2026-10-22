import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { escapeRegex } from '../../common/slug.util';
import { maskPii } from '../../common/structured-logger';
import { ListLogsQueryDto } from './admin-logs.dto';
import { APP_LOGS_TTL_SECONDS, LogsStoreService } from './app-logs.store';

const REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const COUNT_CAP = 10_000;

/** The Mongo filter for the admin filters; exported for the specs. All values are escaped or typed, none is an operator. */
export function buildLogsFilter(q: ListLogsQueryDto): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (q.level) filter.level = q.level;
  if (q.module) filter.module = q.module;
  if (q.request_id) filter.request_id = q.request_id;
  if (q.from || q.to) {
    const ts: Record<string, Date> = {};
    if (q.from) ts.$gte = new Date(q.from);
    if (q.to) ts.$lte = new Date(q.to);
    filter.ts = ts;
  }
  const text = (q.q ?? '').trim();
  if (text) {
    const rx = { $regex: escapeRegex(text), $options: 'i' };
    filter.$or = [{ event: rx }, { module: rx }, { route: rx }, { 'details.message': rx }, { 'details.error': rx }];
  }
  return filter;
}

function present(doc: Record<string, any>) {
  return {
    id: String(doc._id),
    ts: doc.ts instanceof Date ? doc.ts.toISOString() : doc.ts,
    level: doc.level,
    service: doc.service,
    module: doc.module,
    event: doc.event,
    request_id: doc.request_id ?? null,
    user_id: doc.user_id ?? null,
    route: doc.route ?? null,
    status: doc.status ?? null,
    duration_ms: doc.duration_ms ?? null,
    details: (doc.details ? maskPii(doc.details) : null) as Record<string, any> | null,
  };
}

/**
 * 20.3 — read-only view of the stored warn/error lines. Nothing here writes, deletes or exports; the lines are already
 * masked when stored and masked again on the way out.
 */
@Controller('admin/logs')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminLogsController {
  constructor(private readonly store: LogsStoreService) {}

  @Get()
  @RequirePermissions(Permission.SYSTEM_LOGS_VIEW)
  async list(@Query() query: ListLogsQueryDto) {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) throw new BadRequestException('from_after_to');
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 50;
    const filter = buildLogsFilter(query);
    const col = this.store.collection();
    const [rows, total] = await Promise.all([
      col.find(filter).sort({ ts: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
      col.countDocuments(filter, { limit: COUNT_CAP }),
    ]);
    return {
      data: rows.map((r) => present(r as Record<string, any>)),
      page,
      page_size: pageSize,
      total,
      total_capped: total >= COUNT_CAP,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      retention_days: APP_LOGS_TTL_SECONDS / 86400,
      stored_levels: ['warn', 'error'],
      dropped_in_this_process: this.store.dropped,
    };
  }

  /** Every stored line of one request, oldest first. */
  @Get('request/:id')
  @RequirePermissions(Permission.SYSTEM_LOGS_VIEW)
  async byRequest(@Param('id') id: string) {
    if (!REQUEST_ID.test(id)) throw new BadRequestException('invalid_request_id');
    const rows = await this.store.collection().find({ request_id: id }).sort({ ts: 1, _id: 1 }).limit(1000).toArray();
    return { request_id: id, count: rows.length, data: rows.map((r) => present(r as Record<string, any>)) };
  }
}
