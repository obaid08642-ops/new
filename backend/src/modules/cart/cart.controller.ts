import { Controller, Post, Get, UseGuards, Req, ServiceUnavailableException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(@InjectModel('UnifiedCart') private cartModel: Model<any>) {}

  @Post('clear')
  async clearCart(@Req() req) {
    await this.cartModel.updateOne({ patient_id: req.user.id }, { $set: { items: [], total_amount: 0 } });
    return { ok: true, message: 'Cart cleared' };
  }

  @Get('prescription')
  async getPrescription(@Req() req) {
    throw new ServiceUnavailableException('Prescription cart retrieval is disabled until it is derived from a patient-owned prescription and server-priced pharmacy catalog.');
  }
}
