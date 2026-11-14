import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { Public } from '../../common/auth.guard';
import { PublicCache } from '../../common/public-cache.decorator';

@UseGuards(JwtAuthGuard)
@Controller('i18n')
export class I18nController {
  constructor(private svc: I18nService) {}

  @Public()
  @PublicCache(300, ['i18n'], { varyLanguage: true })
  @Get()
  bundle(@Query('lang') lang: 'ar' | 'en' | 'ur') {
    // 18.2: resolveLang() maps an unsupported or absent locale to English.
    return this.svc.all(lang as any);
  }

  @Public()
  @PublicCache(300, ['i18n'])
  @Get('all')
  raw() {
    return this.svc.raw();
  }
}
