import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ban, BanSchema } from './bans.schema';
import { BansService } from './bans.service';
import { BansController } from './bans.controller';
import { BanRepository } from "./repositories/ban.repository";

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Ban.name, schema: BanSchema }])],
  controllers: [BansController],
  providers: [BansService, { provide: 'BanRepository', useClass: BanRepository }],
  exports: [BansService],
})
export class BansModule {}
