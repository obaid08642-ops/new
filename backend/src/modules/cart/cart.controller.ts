import { Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
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
    return {
      doctor: 'د. محمد أحمد الكردي',
      specialty: 'استشاري قلب',
      date: '15 يونيو 2026',
      medications: [
        { id: '1', name: 'بنادول إكسترا', dose: '500mg', qty: 14, price: 18, requiresRx: false },
        { id: '2', name: 'أملوديبين', dose: '5mg', qty: 30, price: 32, requiresRx: true },
        { id: '3', name: 'فيتامين D3', dose: '2000IU', qty: 90, price: 45, requiresRx: false },
      ]
    };
  }
}
