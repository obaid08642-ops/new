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

  /** support/chat.tsx reads messages as {id, from: 'user'|'agent', text, time} from the patient's chat ticket. */
  @Get()
  async bareList(@CurrentUser() user: any): Promise<any[]> {
    const t: any = await this.col.findOne({ user_id: user.id, channel: 'chat' }, { sort: { createdAt: -1 }, projection: { _id: 0, id: 1, thread: 1 } } as any);
    return (t?.thread || []).map((m: any, i: number) => ({
      id: `${t.id}:${i}`, from: m.by === user.id ? 'user' : 'agent', text: m.message,
      time: m.at, isBot: m.role === 'system',
    }));
  }

  /** One chat conversation per patient: messages append to the open chat ticket (a new ticket only when none is open). */
  @Post()
  async bareSend(@CurrentUser() user: any, @Body() body: BareSendDto) {
    const text = String(body?.body || body?.message || '').trim();
    if (!text) throw new BadRequestException('نص الرسالة مطلوب');
    const now = new Date();
    const msg = { by: user.id, role: user.role || 'patient', message: text, at: now };
    const open: any = await this.col.findOneAndUpdate(
      { user_id: user.id, channel: 'chat', status: { $in: ['OPEN', 'IN_PROGRESS'] } } as any,
      { $push: { thread: msg }, $set: { updatedAt: now } } as any,
      { sort: { createdAt: -1 }, returnDocument: 'after' } as any,
    ).then((r: any) => (r && 'value' in r ? r.value : r));
    if (open) return { ok: true, id: open.id, ticket_id: open.id, reply: null };
    const doc = {
      id: uuid(),
      tracking_id: `SUP-${Date.now().toString(36).toUpperCase()}`,
      user_id: user.id, user_name: user.full_name, user_phone: user.phone,
      category: 'GENERAL', subject: text.slice(0, 80), message: text, channel: 'chat',
      source_role: user.role || 'patient', priority: 'medium',
      thread: [msg],
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };
    await this.col.insertOne(doc as any);
    // honest acknowledgement for the first message of a conversation (not an automated answer)
    return { ok: true, id: doc.id, ticket_id: doc.id, reply: `تم استلام رسالتك (${doc.tracking_id}). سيرد عليك فريق الدعم هنا في أقرب وقت.` };
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
