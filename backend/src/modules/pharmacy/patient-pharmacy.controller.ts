import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth.guard';
import { PharmacyShortageService } from './services/pharmacy-shortage.service';

@Controller('patient/pharmacy')
@UseGuards(JwtAuthGuard)
export class PatientPharmacyController {
  constructor(private readonly shortageSvc: PharmacyShortageService) {}

  @Get('shortage-flags/lookup')
  async lookupFlags(@Query('drugName') drugName: string) {
    const flags = await this.shortageSvc.lookupForPatient(undefined, drugName);
    return { flags: flags ? [flags] : [] };
  }
}
