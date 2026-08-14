import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException, Delete, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: any) {
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    const balance = await this.walletService.getBalance(user.id, ownerType);
    return { balance };
  }

  @Get('transactions')
  async getTransactions(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    return this.walletService.getTransactions(user.id, ownerType, +page, +limit);
  }

  @Get('spending-data')
  async getSpendingData(@CurrentUser() user: any) {
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    return this.walletService.getSpendingData(user.id, ownerType);
  }

  @Post('topup')
  async topup(@CurrentUser() user: any, @Body() body: { amount: number; paymentMethod?: string }) {
    if (!body.amount) throw new BadRequestException('amount_required');
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    const desc = `شحن رصيد عبر ${body.paymentMethod || 'مدى'}`;
    const wallet = await this.walletService.topup(user.id, ownerType, body.amount, desc);
    return { success: true, balance: wallet.balance };
  }

  @Post('transfer')
  async transfer(@CurrentUser() user: any, @Body() body: { recipient: string; amount: number }) {
    if (!body.recipient || !body.amount) throw new BadRequestException('recipient_and_amount_required');
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    const wallet = await this.walletService.transfer(user.id, ownerType, body.recipient, body.amount);
    return { success: true, balance: wallet.balance };
  }

  @Get('cards')
  async getCards(@CurrentUser() user: any) {
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    const cards = await this.walletService.getCards(user.id, ownerType);
    return { success: true, cards };
  }

  @Post('cards')
  async addCard(@CurrentUser() user: any, @Body() body: any) {
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    const cards = await this.walletService.addCard(user.id, ownerType, body);
    return { success: true, cards };
  }

  @Delete('cards/:id')
  async removeCard(@CurrentUser() user: any, @Param('id') cardId: string) {
    const ownerType = user.role === 'patient' ? 'patient' : 'provider';
    const cards = await this.walletService.removeCard(user.id, ownerType, cardId);
    return { success: true, cards };
  }
}
