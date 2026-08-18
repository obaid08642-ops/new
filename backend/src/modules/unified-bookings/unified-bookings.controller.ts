import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth.guard';
import { v4 as uuidv4 } from 'uuid';

@Controller('unified-bookings')
@UseGuards(JwtAuthGuard)
export class UnifiedBookingsController {
  @Post('checkout-cart')
  checkout(@Body() body: any) {
    const orderId = `UNI-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    return { ok: true, orderId, timestamp: new Date().toISOString() };
  }
}
