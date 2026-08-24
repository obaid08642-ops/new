import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaternityService } from './maternity.service';
import { MaternityController } from './maternity.controller';
import { MaternityProfileSchema } from '../../schemas/maternity.schema';
import { MaternityProfileRepository } from "./repositories/maternityprofile.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MaternityProfile', schema: MaternityProfileSchema },
    ]),
  ],
  controllers: [MaternityController],
  providers: [MaternityService, { provide: 'MaternityProfileRepository', useClass: MaternityProfileRepository }],
  exports: [MaternityService],
})
export class MaternityModule {}
