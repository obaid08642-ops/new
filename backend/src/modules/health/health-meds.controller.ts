import { Controller, Get, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CurrentUser, SelfService } from '../../common/auth.guard';
import { AddDto } from '../compat/compat.dto';

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('health/medications')
@SelfService()
export class HealthMedsController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async list(@CurrentUser() u: any): Promise<any> {
    const data = await this.conn
      .collection('healthmedications')
      .find({ user_id: uid(u), active: { $ne: false } } as any)
      .sort({ created_at: -1 })
      .toArray();
    return { data };
  }

  @Post()
  async add(@CurrentUser() u: any, @Body() body: AddDto) {
    if (!body?.name) throw new BadRequestException('name_required');
    const med = {
      id: uuid(),
      user_id: uid(u),
      name: String(body.name).slice(0, 200),
      dosage: body.dosage ? String(body.dosage).slice(0, 100) : null,
      form: body.form || 'tablet',
      times: Array.isArray(body.times) ? body.times.slice(0, 6) : [],
      source: body.source || 'manual',
      active: true,
      created_at: now(),
    };
    await this.conn.collection('healthmedications').insertOne(med as any);
    return { data: med };
  }
}
