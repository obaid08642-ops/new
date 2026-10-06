import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { ProviderType, ProviderStatus, UserRole } from '../../common/enums';
import { ApplyDto, AdminCreateDto, RejectDto, SuspendDto} from './providers.dto';

@Controller('providers')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class ProvidersController {
  constructor(private svc: ProvidersService) {}

  /** Public self-registration */
  @Public()
  @Post('apply')
  apply(@Body() body: ApplyDto) {
    return this.svc.apply(body);
  }

  /** Public listing for patient app */
  @Public()
  @Get()
  list(
    @Query('type') type: ProviderType,
    @Query('city') city: string,
    @Query('insurance_company') company?: string,
  ) {
    return this.svc.listPublic(type, city, company);
  }

  /** Public map data — ACTIVE providers with real coordinates + distance from caller. */
  @Public()
  @Get('map')
  map(@Query('type') type?: string, @Query('lat') lat?: string, @Query('lng') lng?: string, @Query('radius_km') radius?: string) {
    return this.svc.mapProviders(type, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined, radius ? parseFloat(radius) : undefined);
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.svc.getPublicById(id);
  }

  /** My own provider profile */
  @Get('me/profile')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.LAB, UserRole.RADIOLOGY, UserRole.HOME_CARE)
  mine(@CurrentUser() user: any) {
    return this.svc.myProfile(user);
  }


  // NOTE: provider profile edit-review ("delta") flows through ONE canonical path:
  //   POST /provider/settings/delta  ->  admin GET/POST /providers/provider-deltas[*]
  // The legacy /providers/me/delta + /providers/admin/deltas/* endpoints were removed:
  // their approve path marked deltas APPROVED without ever applying the changes.
  // ============ Admin ============

  @Post('admin/create')
  @Roles(UserRole.ADMIN)
  adminCreate(@Body() body: AdminCreateDto, @CurrentUser() admin: any) {
    return this.svc.adminCreate(body, admin);
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  adminAll(@Query('type') type: ProviderType, @Query('status') status: ProviderStatus, @Query('search') search: string) {
    return this.svc.listAll(type, status, search);
  }

  @Get('admin/pending')
  @Roles(UserRole.ADMIN)
  pending() {
    return this.svc.listPending();
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.svc.approve(id, admin);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @CurrentUser() admin: any, @Body() body: RejectDto) {
    return this.svc.reject(id, admin, body?.reason || '');
  }

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN)
  suspend(@Param('id') id: string, @CurrentUser() admin: any, @Body() body: SuspendDto) {
    return this.svc.suspend(id, admin, body?.reason || '');
  }
}
