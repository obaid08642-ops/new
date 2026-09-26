import { Controller, Get, Post, Body, Query, ForbiddenException, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { SendDto } from '../compat/compat.dto';

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('family/chat')
@SelfService()
@UseGuards(JwtAuthGuard)
export class FamilyChatController {
  constructor(@InjectConnection() private conn: Connection) {}

  private async familyOf(userId: string) {
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    // `family_groups` is the canonical membership record. The legacy
    // `familymembers` collection did not reliably represent removals, so it
    // could authorize a removed/unrelated user to a family chat room.
    const group = await this.conn.collection('family_groups').findOne({
      is_deleted: { $ne: true },
      $or: [{ owner_id: userId }, { 'members.user_id': userId }],
    } as any);
    if (!group?.id) throw new ForbiddenException('not_active_family_member');
    return String(group.id);
  }

  @Get('messages')
  async list(@CurrentUser() u: any, @Query('limit') limit = '50'): Promise<{ data: any[] }> {
    const owner = await this.familyOf(uid(u));
    const messages = await this.conn
      .collection('familychatmessages')
      .find({ family_id: owner } as any)
      .sort({ created_at: 1 })
      .limit(Math.min(+limit || 50, 200))
      .toArray();
    return { data: messages };
  }

  @Post('messages')
  async send(@CurrentUser() u: any, @Body() body: SendDto) {
    if (!body?.text?.trim()) throw new BadRequestException('text_required');
    const owner = await this.familyOf(uid(u));
    const msg = {
      id: uuid(),
      family_id: owner,
      sender_id: uid(u),
      sender_name: u?.full_name || u?.name || '',
      text: String(body.text).slice(0, 2000),
      created_at: now(),
    };
    await this.conn.collection('familychatmessages').insertOne(msg as any);
    return { data: msg };
  }
}
