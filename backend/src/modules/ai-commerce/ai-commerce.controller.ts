import { Controller, Get, Post, Query, Body, HttpCode, UseGuards } from '@nestjs/common';
import { AiCommerceService, ProductFeedQuery, ServiceFeedQuery } from './ai-commerce.service';
import { CreateCheckoutSessionDto } from './ai-commerce.dto';
import { Public } from '../../common/auth.guard';
import { AIRateLimitGuard } from '../../common/guards/abuse-prevention.guard';

@Controller('public')
export class AiCommerceController {
  constructor(private readonly aiCommerceService: AiCommerceService) {}

  @Public()
  @UseGuards(AIRateLimitGuard)
  @Get('ai-catalog/products')
  async getProducts(@Query() query: ProductFeedQuery) {
    return this.aiCommerceService.getProductFeed(query);
  }

  @Public()
  @UseGuards(AIRateLimitGuard)
  @Get('ai-catalog/services')
  async getServices(@Query() query: ServiceFeedQuery) {
    return this.aiCommerceService.getServiceFeed(query);
  }

  @Public()
  @UseGuards(AIRateLimitGuard)
  @Post('ai-commerce/checkout-session')
  @HttpCode(201)
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.aiCommerceService.createCheckoutSession(dto);
  }
}
