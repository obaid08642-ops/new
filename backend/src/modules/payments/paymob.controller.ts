import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
// src/modules/payments/paymob.controller.ts
import { Controller, Post, Body, Get } from '@nestjs/common';
import { Public } from '../../common/auth.guard';
import { PaymobService } from './paymob.service';

@UseGuards(JwtAuthGuard)
@Controller('payments/paymob')
export class PaymobController {
  constructor(private readonly paymobService: PaymobService) {}

  @Public()
  @Get('methods')
  getMethods() {
    return this.paymobService.getMethods();
  }

  // F-C9: amount is resolved server-side from the referenced record; the
  // authenticated caller must own that record. Client-supplied amounts are ignored.
  @Post('initiate')
  async initiatePayment(@CurrentUser() user: any, @Body() payload: any) {
    return this.paymobService.initiate(payload, user);
  }

  @Post('verify')
  async verifyPayment(@Body() payload: any) {
    return this.paymobService.verify(payload);
  }
}
