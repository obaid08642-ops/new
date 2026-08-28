import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletSchema, WalletTransactionSchema } from '../../schemas/wallet.schema';
import { UserSchema } from '../../schemas/user.schema';
import { UserRepository } from "./repositories/user.repository";
import { WalletRepository } from "./repositories/wallet.repository";
import { WalletTransactionRepository } from "./repositories/wallettransaction.repository";
import { MoyasarModule } from '../moyasar/moyasar.module';

@Module({
  imports: [
    MoyasarModule,
    MongooseModule.forFeature([
      { name: 'Wallet', schema: WalletSchema },
      { name: 'WalletTransaction', schema: WalletTransactionSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, { provide: 'UserRepository', useClass: UserRepository }, { provide: 'WalletRepository', useClass: WalletRepository }, { provide: 'WalletTransactionRepository', useClass: WalletTransactionRepository }],
  exports: [WalletService],
})
export class WalletModule {}
