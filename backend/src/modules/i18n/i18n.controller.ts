import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { Public } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('i18n')
export class I18nController {
  constructor(private svc: I18nService) {}

  @Public()
  @Get()
  bundle(@Query('lang') lang: 'ar' | 'en' | 'ur') {
    return this.svc.all(lang || 'ar');
  }

  @Public()
  @Get('all')
  raw() {
    return this.svc.raw();
  }
}
