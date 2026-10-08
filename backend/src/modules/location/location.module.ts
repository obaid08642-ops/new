import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schemas/location.schema';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { AdminLocationController } from './admin-location.controller';
import { ServiceAreaService } from './service-area.service';
import { CityLaunchService } from './city-launch.service';
import { CoverageService } from './coverage.service';
import { CityOpsController } from './city-ops.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Location.name, schema: LocationSchema }]),
  ],
  controllers: [LocationController, AdminLocationController, CityOpsController],
  providers: [LocationService, ServiceAreaService, CityLaunchService, CoverageService],
  exports: [LocationService, ServiceAreaService, CityLaunchService, CoverageService],
})
export class LocationModule {}
