import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me/profile')
  myProfile(@CurrentUser('id') id: string) {
    return this.users.getPatientProfile(id);
  }

  @Patch('me/profile')
  updateMyProfile(@CurrentUser('id') id: string, @Body() body: any) {
    return this.users.updatePatientProfile(id, body);
  }

  @Get('me/wishlist')
  getWishlist(@CurrentUser('id') id: string) {
    return this.users.getWishlist(id);
  }

  @Post('me/wishlist/:itemId')
  toggleWishlist(@CurrentUser('id') id: string, @Param('itemId') itemId: string) {
    return this.users.toggleWishlist(id, itemId);
  }

  // --- WP 1.6 Settings Endpoints ---
  @Get('me/notification-settings')
  getNotificationSettings(@CurrentUser('id') id: string) {
    return this.users.getNotificationSettings(id);
  }

  @Patch('me/notification-settings')
  updateNotificationSettings(@CurrentUser('id') id: string, @Body() body: any) {
    return this.users.updateNotificationSettings(id, body);
  }

  @Get('me/storage')
  getStorageDetails(@CurrentUser('id') id: string) {
    return this.users.getStorageDetails(id);
  }

  @Get('me/privacy-settings')
  getPrivacySettings(@CurrentUser('id') id: string) {
    return this.users.getPrivacySettings(id);
  }

  @Patch('me/privacy-settings')
  updatePrivacySettings(@CurrentUser('id') id: string, @Body() body: any) {
    return this.users.updatePrivacySettings(id, body);
  }

  @Get('me/security-settings')
  getSecuritySettings(@CurrentUser('id') id: string) {
    return this.users.getSecuritySettings(id);
  }

  @Patch('me/security-settings')
  updateSecuritySettings(@CurrentUser('id') id: string, @Body() body: any) {
    return this.users.updateSecuritySettings(id, body);
  }

  @Post('me/change-password')
  changePassword(@CurrentUser('id') id: string, @Body() body: any) {
    return this.users.changePassword(id, body);
  }

  @Get('me/sessions')
  getSessions(@CurrentUser('id') id: string) {
    return this.users.getSessions(id);
  }
  @Get()
  @Roles(UserRole.ADMIN)
  list(@Query('role') role: UserRole, @Query('search') search: string) {
    return this.users.listAll(role, search);
  }

  @Post(':id/toggle')
  @Roles(UserRole.ADMIN)
  toggle(@Param('id') id: string, @CurrentUser() by: any) {
    return this.users.toggle(id, by);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() by: any) {
    return this.users.deleteUser(id, by);
  }
}
