import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import { Public } from '../../common/auth.guard';
import { ShedOnOverload } from '../../common/load-shedding.guard';
import { CLIENT_SIGNALS, RANKED_VERTICALS, type RankedVertical } from './catalogue-ranking';
import { CatalogueRankingService } from './catalogue-ranking.service';

export class CatalogueRankingEventDto {
  @IsIn([...RANKED_VERTICALS]) vertical!: RankedVertical;
  @IsString() @IsNotEmpty() @MaxLength(64) service_id!: string;
  @IsString() @IsIn(['view', 'search', 'cart_add', 'order']) event!: string;
  @IsOptional() @IsString() @MaxLength(64) session_id?: string;
}

@Controller('catalogue/ranking')
@ShedOnOverload() // the first thing shed under overload: a missed counter costs nothing
export class CatalogueRankingController {
  constructor(private readonly ranking: CatalogueRankingService) {}

  /** The signals a browser or an app can honestly report: a service page viewed, a search result opened. Cart adds and orders are counted by the server. */
  @Public()
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async event(@Body() body: CatalogueRankingEventDto, @Req() req: Request) {
    if (!(CLIENT_SIGNALS as readonly string[]).includes(body.event)) throw new BadRequestException('event_recorded_by_server');
    const result = await this.ranking.recordClientSignal(body.vertical, body.service_id, body.event as 'view' | 'search', {
      ip: req.ip || req.socket?.remoteAddress, userAgent: req.headers['user-agent'], sessionId: body.session_id,
    });
    return { status: 'success', ...result };
  }
}
