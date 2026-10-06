import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ExperimentService } from './experiment.service';
import { AssignVariantDto, CreateExperimentDto, RecordConversionDto, ReportObservationsDto } from './experiment.dto';

@Controller('admin/experiments')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class ExperimentController {
  constructor(private readonly svc: ExperimentService) {}

  @Post()
  create(@Body() body: CreateExperimentDto) {
    return this.svc.create(body);
  }

  @Post(':key/stop')
  stop(@Param('key') key: string) {
    return this.svc.stop(key);
  }

  @Post(':key/assign')
  assign(@Param('key') key: string, @Body() body: AssignVariantDto) {
    return this.svc.assign(key, body);
  }

  @Post(':key/convert')
  convert(@Param('key') key: string, @Body() body: RecordConversionDto) {
    return this.svc.convert(key, body);
  }

  @Get(':key/report')
  report(@Param('key') key: string) {
    return this.svc.report(key);
  }

  @Post(':key/report')
  reportWithMetrics(@Param('key') key: string, @Body() body: ReportObservationsDto) {
    return this.svc.report(key, body?.metrics);
  }
}
