import { Controller, Get, Post, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CurrentUser, SelfService } from '../../common/auth.guard';
import { IngestDto, RegisterDto } from '../compat/compat.dto';

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('wearables')
@SelfService()
export class WearablesController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('devices')
  async devices(@CurrentUser() u: any): Promise<any> {
    const data = await this.conn.collection('wearabledevices').find({ user_id: uid(u) } as any).toArray();
    return { data };
  }

  @Post('devices')
  async register(@CurrentUser() u: any, @Body() body: RegisterDto) {
    if (!body?.kind) throw new BadRequestException('kind_required');
    const dev = {
      id: uuid(),
      user_id: uid(u),
      kind: String(body.kind).slice(0, 50),
      name: body.name ? String(body.name).slice(0, 100) : null,
      connected_at: now(),
    };
    await this.conn.collection('wearabledevices').updateOne({ user_id: uid(u), kind: dev.kind } as any, { $set: dev }, { upsert: true });
    return { data: dev };
  }

  @Get('data')
  async data(@CurrentUser() u: any, @Query('metric') metric?: string, @Query('days') days = '7'): Promise<any> {
    const since = new Date(Date.now() - (+days || 7) * 86400000);
    const q: any = { user_id: uid(u), recorded_at: { $gte: since } };
    if (metric) q.metric = metric;
    const data = await this.conn.collection('wearabledata').find(q).sort({ recorded_at: 1 }).limit(2000).toArray();
    return { data };
  }

  @Post('data')
  async ingest(@CurrentUser() u: any, @Body() body: IngestDto) {
    const rows = (Array.isArray(body?.samples) ? body.samples : [body]).filter((s: any) => s?.metric && s?.value != null);
    if (!rows.length) throw new BadRequestException('samples_required');
    const docs = rows.slice(0, 500).map((s: any) => ({
      id: uuid(),
      user_id: uid(u),
      metric: String(s.metric).slice(0, 50),
      value: Number(s.value),
      unit: s.unit ? String(s.unit).slice(0, 20) : null,
      source: s.source || 'manual',
      recorded_at: s.recorded_at ? new Date(s.recorded_at) : now(),
    }));
    await this.conn.collection('wearabledata').insertMany(docs as any);
    return { inserted: docs.length };
  }
}
