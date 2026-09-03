import { Controller, Get, Param, Query } from '@nestjs/common';
import { EntityGraphService } from './entity-graph.service';
import { Public } from '../../common/auth.guard';

@Controller('entity-graph')
export class EntityGraphController {
  constructor(private readonly graphService: EntityGraphService) {}

  @Public()
  @Get('related/:type/:id')
  async getRelated(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.graphService.getRelated(type, id);
  }

  @Public()
  @Get('explore')
  async explore(
    @Query('specialty') specialty?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('insurance') insurance?: string,
  ) {
    return this.graphService.explore({ specialty, city, district, insurance });
  }
}
