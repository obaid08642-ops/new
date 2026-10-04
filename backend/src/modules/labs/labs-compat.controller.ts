import { Controller, Get, Param, ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('labs')
@UseGuards(JwtAuthGuard)
export class PatientLabsCatalogController {
  constructor(@InjectConnection() private conn: Connection) {}
  // Q48: `labs_catalog` is empty and nothing writes it. The lab is a provider,
  // so read the lab's provider profile and its real `lab_services`.
  @Get(':id')
  async one(@CurrentUser() u: any, @Param('id') id: string) {
    if (!uid(u)) throw new ForbiddenException('authenticated_user_required');
    const key = String(id);
    const p: any = await this.conn.db.collection('provider_profiles').findOne({
      $or: [{ account_id: { $eq: key } }, { id: { $eq: key } }],
      type: { $in: ['laboratory', 'lab'] },
      status: 'active',
      public_eligibility: true,
    } as any);
    if (!p) throw new NotFoundException('lab_not_found');
    const services: any[] = await this.conn.db.collection('lab_services')
      .find({ $or: [{ lab_id: p.account_id }, { provider_id: p.account_id }, { lab_account_id: p.account_id }], active: { $ne: false } } as any)
      .limit(200).toArray().catch(() => []);
    const { _id, ...prof } = p;
    return { data: { ...prof, id: p.account_id, services } };
  }
}
