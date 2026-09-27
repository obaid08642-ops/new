import { Controller, Get, Post, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CurrentUser, SelfService } from '../../common/auth.guard';
import { MarkDto } from '../compat/compat.generated.dto';

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

const SA_VACCINE_SCHEDULE = [
  { code: 'BCG+HBV0', name_ar: 'بي سي جي + جدري الكبد (ب)', age_weeks: 0, age_label_ar: 'عند الولادة' },
  { code: 'HBV1+DTaP1+IPV1+PCV1+Rota1+Hib1', name_ar: 'الجرعة الأولى السداسية', age_weeks: 8, age_label_ar: 'شهران' },
  { code: 'DTaP2+IPV2+PCV2+Rota2+Hib2', name_ar: 'الجرعة الثانية السداسية', age_weeks: 16, age_label_ar: '4 أشهر' },
  { code: 'DTaP3+IPV3+PCV3+Rota3+Hib3+HBV3', name_ar: 'الجرعة الثالثة السداسية', age_weeks: 24, age_label_ar: '6 أشهر' },
  { code: 'MMR1+Varicella1', name_ar: 'الحصبة والنكاف والحصبة الألمانية + جدري الماء', age_weeks: 52, age_label_ar: '12 شهرًا' },
  { code: 'HepA1+DTaP4+Hib4+PCV4', name_ar: 'التهاب الكبد أ + المعززة', age_weeks: 78, age_label_ar: '18 شهرًا' },
  { code: 'DTaP5+IPV4+MMR2+Varicella2', name_ar: 'الجرعة المعززة قبل المدرسة', age_weeks: 208, age_label_ar: '4-6 سنوات' },
];

@Controller('maternity/vaccines')
@SelfService()
export class MaternityVaccinesController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async list(@CurrentUser() u: any, @Query('baby_id') babyId?: string): Promise<any> {
    const taken = await this.conn
      .collection('maternityvaccines')
      .find({ user_id: uid(u), ...(babyId ? { baby_id: babyId } : {}) } as any)
      .toArray();
    const takenCodes = new Set(taken.map((t: any) => t.code));
    return {
      schedule: SA_VACCINE_SCHEDULE.map((v) => ({ ...v, taken: takenCodes.has(v.code) })),
      records: taken,
    };
  }

  @Post()
  async mark(@CurrentUser() u: any, @Body() body: MarkDto) {
    if (!body?.code) throw new BadRequestException('code_required');
    if (!SA_VACCINE_SCHEDULE.some((v) => v.code === body.code)) throw new BadRequestException('unknown_vaccine_code');
    const rec = { id: uuid(), user_id: uid(u), baby_id: body.baby_id || null, code: body.code, taken_at: body.taken_at ? new Date(body.taken_at) : now(), created_at: now() };
    await this.conn.collection('maternityvaccines').updateOne({ user_id: uid(u), code: body.code, baby_id: rec.baby_id } as any, { $set: rec }, { upsert: true });
    return { data: rec };
  }
}
