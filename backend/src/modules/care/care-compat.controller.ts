import { Controller, Get, Post, Body, Param, ForbiddenException, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { SendMessageDto } from '../compat/compat.dto';

const byStringOrObjectId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
  return { $or: or };
};

async function facilityIdOf(conn: Connection, u: string): Promise<string> {
  const account: any = await conn.collection('provider_accounts')
    .findOne({ $or: [{ id: u }, { user_id: u }, { _id: u }] } as any);
  return account?.facility_id || account?.id || u;
}

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('consultations')
@SelfService()
export class ConsultationsCompatController {
  constructor(@InjectConnection() private conn: Connection) {}

  private async ownedAppointment(id: string, u: string) {
    const b: any = await this.conn.collection('appointments').findOne(byStringOrObjectId(id) as any);
    if (!b) throw new NotFoundException('الاستشارة غير موجودة');
    const owner = b.patient_id || b.user_id;
    if (owner && String(owner) !== String(u)) throw new ForbiddenException('لا تملك هذه الاستشارة');
    return b;
  }

  @Get(':id')
  async detail(@Param('id') id: string, @CurrentUser() user: any) {
    const u = uid(user);
    const b = await this.ownedAppointment(id, u);
    const pid = b.provider_id || b.doctor_id;
    const profile = pid
      ? await this.conn.collection('provider_profiles').findOne({
          $or: [{ id: pid }, { user_id: pid }, { account_id: pid }],
        } as any)
      : null;
    return {
      id: b.id || String(b._id), status: b.status, kind: b.kind || 'consultation',
      scheduled_at: b.scheduled_at || b.starts_at, price: b.price, notes: b.notes,
      provider: profile ? { id: profile.id || String(profile._id), name: profile.name, specialty: profile.specialty } : null,
      consultation_id: b.id || String(b._id),
    };
  }

  @Get(':id/messages')
  async messages(@Param('id') id: string, @CurrentUser() user: any) {
    const u = uid(user);
    const b = await this.ownedAppointment(id, u);
    const key = b.id || String(b._id);
    const rows = await this.conn.collection('consultation_messages')
      .find({ consultation_id: key } as any).sort({ createdAt: 1 }).limit(300).toArray();
    return rows.map((r: any) => ({
      id: String(r._id), body: r.body, sender: String(r.sender_id) === String(u) ? 'me' : 'other',
      created_at: r.createdAt,
    }));
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: SendMessageDto) {
    const u = uid(user);
    const b = await this.ownedAppointment(id, u);
    const text = String(body?.body || '').trim();
    if (!text) throw new BadRequestException('نص الرسالة مطلوب');
    const ins = await this.conn.collection('consultation_messages').insertOne({
      consultation_id: b.id || String(b._id), sender_id: u, body: text, createdAt: now(),
    } as any);
    return { ok: true, id: String(ins.insertedId) };
  }
}
