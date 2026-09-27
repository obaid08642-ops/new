import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourService } from './tour.service';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [],
  providers: [TourService],
})
export class TourModule {}
