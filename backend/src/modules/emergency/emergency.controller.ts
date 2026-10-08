import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { EmergencyService } from './emergency.service';
import { ShareLocationDto } from './emergency.dto';

/**
 * Owner decision 14 (answer O-2): no ambulance request, dispatch or tracking from our side. The emergency
 * button dials 997 on the device; the one server action left is sharing the patient's location with their
 * own emergency contacts.
 */
@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private readonly svc: EmergencyService) {}

  /** POST /api/v1/emergency/share-location { lat, lng } */
  @SelfService()
  @Post('share-location')
  shareLocation(@Body() body: ShareLocationDto, @CurrentUser() user: any) {
    return this.svc.shareLocation(user, body);
  }
}
