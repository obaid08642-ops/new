import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

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

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('facility')
@Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
export class FacilityInboxController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('inbox')
  async inbox(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('facilityinbox')
      .find({ facility_id: fid } as any).sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({
      id: String(r._id), kind: r.kind, title: r.title, body: r.body,
      read: !!r.read, created_at: r.createdAt,
    }));
  }

  @Post('inbox/:id/read')
  async markRead(@Param('id') id: string) {
    await this.conn.collection('facilityinbox')
      .updateOne(byStringOrObjectId(id) as any, { $set: { read: true } });
    return { ok: true };
  }
}
