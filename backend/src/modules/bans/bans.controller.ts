import { Controller, Get, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { BansService } from './bans.service';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

class CreateBanDto {
  @IsEnum(['ip', 'device']) type: 'ip' | 'device';
  @IsString() value: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsDateString() expires_at?: Date;
}

@Controller('bans')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class BansController {
  constructor(private bansService: BansService) {}

  @Post()
  ban(@CurrentUser('id') adminId: string, @Body() dto: CreateBanDto) {
    return this.bansService.ban(adminId, dto.type, dto.value, dto.reason, dto.expires_at);
  }

  @Delete(':value')
  unban(@Param('value') value: string) {
    return this.bansService.unban(value);
  }

  @Get()
  getBans() {
    return this.bansService.getBans();
  }
}
