import { Controller, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SearchIntentService, ExtractedSearchIntent } from './search-intent.service';
import { Public } from '../../common/auth.guard';

@Controller('search/intent')
export class SearchIntentController {
  constructor(private readonly intentService: SearchIntentService) {}

  @Public()
  @Post()
  async extractIntent(
    @Body('query') query: string,
    @Body('locale') locale?: string,
    @Body('client_type') clientType?: string,
  ): Promise<ExtractedSearchIntent> {
    return this.intentService.extractIntent(query, locale || 'ar', clientType || 'web');
  }
}
