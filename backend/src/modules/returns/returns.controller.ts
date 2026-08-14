import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('pharmacy/returns')
@UseGuards(JwtAuthGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    return this.returnsService.createRequest(user.id, body);
  }

  @Get()
  async list(@CurrentUser() user: any) {
    return this.returnsService.myReturns(user.id);
  }

  @Get(':id')
  async getDetails(@Param('id') id: string, @CurrentUser() user: any) {
    return this.returnsService.getById(id, user.id, user.role);
  }

  @Post(':id/decide')
  @Roles(UserRole.ADMIN)
  async decide(
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'rejected'; note?: string },
    @CurrentUser() adminUser: any,
  ) {
    return this.returnsService.adminDecide(id, body.decision, body.note || '', adminUser);
  }
}
