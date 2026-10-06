import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { BundlesService } from './bundles.service';

/** P22.3 — bundles + alternatives (read-only, pharmacist-safe rules attached). */
@Controller('pharmacy/bundles')
@UseGuards(JwtAuthGuard)
export class BundlesController {
  constructor(private readonly svc: BundlesService) {}

  @Get('frequently-bought-together')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.PHARMACY)
  together(
    @Query('medicine_id') medicineId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const pid = String(user.role || '').toLowerCase() === 'patient' ? user.id : undefined;
    return this.svc.frequentlyBoughtTogether(medicineId, pid);
  }
}

/** Same-ingredient alternatives under the catalog-shaped path. */
@Controller('pharmacy/medicines')
@UseGuards(JwtAuthGuard)
export class MedicineAlternativesController {
  constructor(private readonly svc: BundlesService) {}

  @Get(':id/alternatives')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.PHARMACY)
  alternatives(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const pid = String(user.role || '').toLowerCase() === 'patient' ? user.id : undefined;
    return this.svc.alternatives(id, pid);
  }
}
