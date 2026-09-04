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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';
import { Public } from '../../common/auth.guard';
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

@ApiTags('Product Ranking')
@Controller('medicines/events')
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
