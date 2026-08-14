import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HeatmapData } from '../schemas/heatmap-data.schema';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';

@Controller('nabd-extensions/admin/analytics')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(
    @InjectModel(HeatmapData.name) private heatmapModel: Model<HeatmapData>
  ) {}

  @Get('heatmaps')
  async getHeatmaps() {
    // Renders dense density point rings tracking active live demand clusters
    const data = await this.heatmapModel.find().exec();
    return { data };
  }
}
