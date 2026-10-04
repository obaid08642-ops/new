import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth.guard';
import { PharmacyShortageService } from './services/pharmacy-shortage.service';

@Controller('patient/pharmacy')
@UseGuards(JwtAuthGuard)
export class PatientPharmacyController {
  constructor(private readonly shortageSvc: PharmacyShortageService) {}

  // R4: GET shortage-flags/lookup removed (dup of pharmacy.controllers PatientShortageController).
}
