import { JwtAuthGuard } from '../../common/auth.guard';
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

  @Post('initiate')
  async initiatePayment(@Body() payload: any) {
    
    return this.paymobService.initiate(payload);
  }

  @Post('verify')
  async verifyPayment(@Body() payload: any) {
    
    return this.paymobService.verify(payload);
  }
}
