import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AsapDto, BroadcastOfferDto, PhotoOrderDto } from './ordering.dto';
import { OrderingBroadcastService } from './ordering-broadcast.service';

// M4, the patient's side: ASAP broadcast and photo order. Every read and write is scoped to the caller's own broadcast.
@Controller('ordering')
@Roles(UserRole.PATIENT)
export class OrderingBroadcastController {
  constructor(private readonly svc: OrderingBroadcastService) {}

  @Post('asap') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  start(@CurrentUser() u: { id: string }, @Body() body: AsapDto) { return this.svc.startAsap(u, body); }

  @Get('asap/:id')
  one(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.getAsap(u, id); }

  @Post('asap/:id/cancel') @HttpCode(200)
  cancel(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.cancelAsap(u, id); }

  @Post('photo-order') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  photo(@CurrentUser() u: { id: string }, @Body() body: PhotoOrderDto) { return this.svc.startPhoto(u, body); }

  @Get('photo-order/:id/offers')
  offers(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.listOffers(u, id); }

  @Post('photo-order/:id/offers/:offerId/accept')
  accept(@CurrentUser() u: { id: string }, @Param('id') id: string, @Param('offerId') offerId: string) { return this.svc.acceptOffer(u, id, offerId); }
}

// M4, the provider's side: the broadcasts it was reached by (never others), acceptance and offers.
@Controller('provider/ordering/broadcasts')
@Roles(UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSING, UserRole.NURSE)
export class ProviderBroadcastController {
  constructor(private readonly svc: OrderingBroadcastService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) { return this.svc.providerList(u); }

  @Post(':id/accept') @HttpCode(200)
  accept(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.providerAccept(u, id); }

  @Post(':id/offer')
  offer(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() body: BroadcastOfferDto) { return this.svc.providerOffer(u, id, body); }
}
