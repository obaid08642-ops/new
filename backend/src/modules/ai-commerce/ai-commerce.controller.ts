import { UseInterceptors } from '@nestjs/common';
import { StripInternalReviewFieldsInterceptor } from '../../common/strip-internal-fields';
import { Controller, Get, Post, Query, Body, HttpCode } from '@nestjs/common';
import { AiCommerceService, ProductFeedQuery, ServiceFeedQuery } from './ai-commerce.service';
import { CreateCheckoutSessionDto } from './ai-commerce.dto';
import { Public } from '../../common/auth.guard';

@Controller('public')
@UseInterceptors(StripInternalReviewFieldsInterceptor)
export class AiCommerceController {
  constructor(private readonly aiCommerceService: AiCommerceService) {}

  @Public()
  @Get('ai-catalog/products')
  async getProducts(@Query() query: ProductFeedQuery) {
    return this.aiCommerceService.getProductFeed(query);
  }

  @Public()
  @Get('ai-catalog/services')
  async getServices(@Query() query: ServiceFeedQuery) {
    return this.aiCommerceService.getServiceFeed(query);
  }

  @Public()
  @Post('ai-commerce/checkout-session')
  @HttpCode(201)
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.aiCommerceService.createCheckoutSession(dto);
  }
}
