import { Controller, Get, Post, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { B2BRequestDocument } from '../../schemas/b2b-request.schema';
import { B2bDecisionDto } from './admin-governance.dto';
import { UserRole } from '../../common/enums';


@Controller('b2b')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class B2BController {
  constructor(
    @InjectModel('B2BRequest') private readonly b2bModel: Model<B2BRequestDocument>,
  ) {}

  @Get('requests')
  async list() {
    let requests = await this.b2bModel.find().sort({ submitted: -1 }).lean();
    
    // Mocks removed as per strict production constraints.
    
    return requests;
  }

  @Post('requests/:id/approve')
  async approve(@Param('id') id: string, @Body() body?: B2bDecisionDto) {
    const req = await this.b2bModel.findOne({ id: { $eq: id } });
    if (!req) throw new NotFoundException('Request not found');
    req.status = 'approved';
    if (body?.note) req.notes = (req.notes ? req.notes + ' | ' : '') + 'ملاحظة أدمن: ' + body.note;
    await req.save();
    return req.toObject();
  }

  @Post('requests/:id/reject')
  async reject(@Param('id') id: string, @Body() body?: B2bDecisionDto) {
    const req = await this.b2bModel.findOne({ id: { $eq: id } });
    if (!req) throw new NotFoundException('Request not found');
    req.status = 'rejected';
    if (body?.note) req.notes = (req.notes ? req.notes + ' | ' : '') + 'سبب الرفض: ' + body.note;
    await req.save();
    return req.toObject();
  }
}
