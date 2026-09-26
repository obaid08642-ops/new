import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';

@Controller('patient-ux')
@UseGuards(JwtAuthGuard)
export class PatientReviewsListController {
  constructor(@InjectConnection() private conn: Connection) {}
  @Get('reviews')
  async list(@CurrentUser() u: any, @Query('target_id') targetId?: string, @Query('limit') limit = '20', @Query('page') page = '1') {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = Math.max((parseInt(page, 10) || 1) - 1, 0) * lim;
    const filter: any = {};
    if (targetId) filter.target_id = targetId;
    const docs = await this.conn.db.collection('reviews').find(filter).sort({ created_at: -1 }).skip(skip).limit(lim).toArray();
    return { data: docs.map(({ _id, ...d }: any) => d), page: parseInt(page, 10) || 1, limit: lim };
  }
}
