import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';
import { Public } from '../../common/auth.guard';
import { ShedOnOverload } from '../../common/load-shedding.guard';
import { ProductRankingEventService, RankingEventType } from './product-ranking-event.service';
import { ProductRankingService } from './product-ranking.service';

export class RecordEventPayload {
  @IsString()
  @IsNotEmpty()
  event_type!: RankingEventType;

  @IsString()
  @IsNotEmpty()
  drug_id!: string;

  @IsOptional()
  @IsString()
  pharmacy_id?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/** The events a client may send: a view, a search result opened, a click. */
const CLIENT_EVENT_TYPES = new Set<string>(['product_viewed', 'product_searched', 'product_clicked']);

@ApiTags('Product Ranking')
@Controller('medicines/events')
@ShedOnOverload() // 14.17: recommendations shed first under overload
export class ProductRankingController {
  constructor(
    private readonly eventService: ProductRankingEventService,
    private readonly rankingService: ProductRankingService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record user interaction event for dynamic continuous re-ranking' })
  @ApiResponse({ status: 200, description: 'Event accepted and processed' })
  async recordEvent(@Body() payload: RecordEventPayload, @Req() req: Request) {
    // The server records cart adds, wishlist adds and purchases itself (cart, wishlist and order services). This public
    // endpoint takes only the signals a browser or an app can honestly report, so nobody can post purchases to rank a product.
    if (!CLIENT_EVENT_TYPES.has(payload.event_type)) throw new BadRequestException('event_recorded_by_server');
    const user = (req as any).user;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await this.eventService.recordEvent({
      eventType: payload.event_type,
      drugId: payload.drug_id,
      pharmacyId: payload.pharmacy_id || 'global',
      category: payload.category || 'general',
      quantity: payload.quantity || 1,
      userId: user?.id || user?.sub,
      sessionId: payload.session_id,
      ipAddress,
      metadata: payload.metadata,
    });

    return {
      status: 'success',
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('telemetry/:drugId')
  @ApiOperation({ summary: 'Inspect live ranking telemetry and score calculation for a product' })
  async getTelemetry(
    @Param('drugId') drugId: string,
    @Query('pharmacy_id') pharmacyId?: string,
  ) {
    return this.rankingService.getTelemetry(drugId, pharmacyId || 'global');
  }
}
