import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, SelfService } from '../../common/auth.guard';
import { BatchDto } from '../compat/compat.dto';
import { OneDto } from '../compat/compat.generated.dto';

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('audit')
@SelfService()
export class AuditIngestController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Post()
  async one(@CurrentUser() user: any, @Body() body: OneDto) {
    await this.conn.collection('clientevents').insertOne({
      account_id: uid(user), kind: String(body?.kind || body?.event || 'generic'),
      screen: body?.screen || null, meta: body?.meta || body?.data || {}, createdAt: now(),
    } as any);
    return { ok: true };
  }

  @Post('batch')
  async batch(@CurrentUser() user: any, @Body() body: BatchDto) {
    const list = Array.isArray(body?.events) ? body.events.slice(0, 100) : [];
    if (list.length) {
      await this.conn.collection('clientevents').insertMany(list.map((e: any) => ({
        account_id: uid(user), kind: String(e?.kind || e?.event || 'generic'),
        screen: e?.screen || null, meta: e?.meta || e?.data || {}, createdAt: now(),
      })) as any);
    }
    return { ok: true, inserted: list.length };
  }
}
