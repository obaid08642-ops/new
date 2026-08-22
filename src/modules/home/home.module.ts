import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { PromotionCampaign, PromotionCampaignSchema } from '../../schemas/promotion-campaign.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromotionCampaign.name, schema: PromotionCampaignSchema },
      { name: Appointment.name, schema: AppointmentSchema }
    ]),
  ],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
