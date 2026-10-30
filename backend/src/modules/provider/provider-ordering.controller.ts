import { UseInterceptors } from '@nestjs/common';
import { StripInternalReviewFieldsInterceptor } from '../../common/strip-internal-fields';
import { Body, Controller, Get, Header, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { OrderingBulkPriceDto, OrderingCopyModeDto, OrderingImportDto, OrderingItemDto, OrderingSettingsDto } from './provider-ordering.dto';
import { ProviderOrderingService } from './services/provider-ordering.service';

// M1: the provider's ordering declaration (lab, radiology, nursing). The kind of each write is checked in the service
// against the provider's own type, so a lab cannot declare radiology items.
@Controller('provider/ordering')
@UseInterceptors(StripInternalReviewFieldsInterceptor)
@Roles(UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSING, UserRole.NURSE)
export class ProviderOrderingController {
  constructor(private readonly svc: ProviderOrderingService) {}

  @Get('settings') getSettings(@CurrentUser() u: any) { return this.svc.getSettings(u); }
  @Put('settings') putSettings(@CurrentUser() u: any, @Body() body: OrderingSettingsDto) { return this.svc.putSettings(u, body); }

  @Get('items') listItems(@CurrentUser() u: any, @Query('service_kind') kind: string) { return this.svc.listItems(u, kind); }
  @Put('items') putItem(@CurrentUser() u: any, @Body() body: OrderingItemDto) { return this.svc.putItem(u, body); }
  @Post('items/bulk-price') bulkPrice(@CurrentUser() u: any, @Body() body: OrderingBulkPriceDto) { return this.svc.bulkPrice(u, body); }
  @Post('items/copy-mode') copyMode(@CurrentUser() u: any, @Body() body: OrderingCopyModeDto) { return this.svc.copyMode(u, body); }
  @Get('items/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  exportCsv(@CurrentUser() u: any, @Query('service_kind') kind: string) { return this.svc.exportCsv(u, kind); }
  @Post('items/import') importCsv(@CurrentUser() u: any, @Body() body: OrderingImportDto) { return this.svc.importCsv(u, body); }

  @Get('completeness') completeness(@CurrentUser() u: any) { return this.svc.completeness(u); }
}

// Migration of the pre-M1 rows: platform admins only (super_admin).
@Controller('admin/ordering')
@Roles(UserRole.SUPER_ADMIN)
export class AdminOrderingController {
  constructor(private readonly svc: ProviderOrderingService) {}

  @RequirePermissions(Permission.CATALOG_IMPORT)
  @Post('migrate-capabilities') migrate(@CurrentUser() u: any) { return this.svc.migrateLegacy(u.id); }
}
