import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser } from '../../common/auth.guard';

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('provider-deltas')
export class ProviderDeltasMineController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async mine(@CurrentUser() user: any) {
    const u = uid(user);
    const rows = await this.conn.collection('provider_deltas')
      .find({ $or: [{ account_id: u }, { provider_account_id: u }, { user_id: u }, { provider_id: u }] } as any)
      .sort({ createdAt: -1 }).limit(50).toArray();
    return rows.map((d: any) => ({
      id: String(d._id), kind: d.kind || d.type, status: d.status,
      summary: d.summary || d.title, created_at: d.createdAt,
    }));
  }
}
