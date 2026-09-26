import { Controller, Get, Param, ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('labs')
@UseGuards(JwtAuthGuard)
export class PatientLabsCatalogController {
  constructor(@InjectConnection() private conn: Connection) {}
  @Get(':id')
  async one(@CurrentUser() u: any, @Param('id') id: string) {
    if (!uid(u)) throw new ForbiddenException('authenticated_user_required');
    const doc = await this.conn.db.collection('labs_catalog').findOne({ $or: [{ id }, { _id: id as any }] } as any);
    if (!doc) throw new NotFoundException('lab_not_found');
    const { _id, ...out } = doc as any;
    return { data: out };
  }
}
