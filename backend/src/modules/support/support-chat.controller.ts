import { Controller, Get, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CurrentUser, SelfService } from '../../common/auth.guard';
import { BareSendDto, SendDto2 } from '../compat/compat.dto';

const now = () => new Date();

@Controller('support/chat')
@SelfService()
export class SupportChatController {
  constructor(
    @InjectConnection() private conn: Connection,
  ) {}

  private get col() {
    return this.conn.collection('supportrequests');
  }

  @Get()
  async bareList(@CurrentUser() user: any): Promise<any> {
    const docs = await this.col.find({ user_id: user.id }, { projection: { _id: 0, __v: 0 } }).sort({ createdAt: -1 }).limit(80).toArray();
    return docs;
  }

  @Post()
  async bareSend(@CurrentUser() user: any, @Body() body: BareSendDto) {
    const text = String(body?.body || body?.message || '').trim();
    if (!text) throw new BadRequestException('نص الرسالة مطلوب');
    const doc = {
      id: uuid(),
      tracking_id: `SUP-${Date.now().toString(36).toUpperCase()}`,
      user_id: user.id, user_name: user.full_name, user_phone: user.phone,
      category: 'GENERAL', subject: text.slice(0, 80), message: text,
      source_role: user.role || 'patient', priority: 'medium',
      thread: [{ by: user.id, role: user.role || 'patient', message: text, at: new Date() }],
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.col.insertOne(doc as any);
    return { ok: true, id: doc.id, ticket_id: doc.id };
  }

  @Get('messages')
  async list(@CurrentUser() user: any) {
    const rows: any[] = await this.col.find({ user_id: user.id }, { projection: { _id: 0, thread: 1 } }).sort({ createdAt: -1 }).limit(20).toArray();
    const flat = rows.flatMap((r: any) => (r.thread || []).map((m: any) => ({ body: m.message, from: m.by === user.id ? 'patient' : m.role, created_at: m.at })));
    return flat.slice(-300);
  }

  @Post('messages')
  async send(@CurrentUser() user: any, @Body() body: SendDto2) {
    return this.bareSend(user, body);
  }
}
