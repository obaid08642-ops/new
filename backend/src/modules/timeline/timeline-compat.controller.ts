import { Controller, Get, Param, ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, SelfService } from '../../common/auth.guard';

const byStringOrObjectId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
  return { $or: or };
};

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('reports')
export class ReportsTimelineController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('timeline')
  async timeline(@CurrentUser() user: any) {
    const u = uid(user);
    const rows = await this.conn.collection('medicalreports')
      .find({ patient_id: u } as any).sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), tracking_id: r.tracking_id,
      kind: r.report_type, title: r.title_ar || r.title_en,
      provider: r.doctor_name, date: r.createdAt, critical: !!r.critical,
    }));
  }

  @Get(':id')
  async byId(@Param('id') id: string, @CurrentUser() user: any) {
    const u = uid(user);
    const r: any = await this.conn.collection('medicalreports').findOne(byStringOrObjectId(id) as any);
    if (!r) throw new NotFoundException('التقرير غير موجود');
    if (r.patient_id && String(r.patient_id) !== String(u)) {
      throw new ForbiddenException('لا تملك صلاحية عرض هذا التقرير');
    }
    return { ...r, id: r.id || String(r._id) };
  }
}
