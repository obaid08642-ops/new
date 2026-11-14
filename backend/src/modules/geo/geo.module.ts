import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from '../location/schemas/location.schema';
import { LocationModule } from '../location/location.module';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { NominatimSource, SplGeocodeSource } from './geo-sources';

@Module({
  imports: [MongooseModule.forFeature([{ name: Location.name, schema: LocationSchema }]), LocationModule],
  controllers: [GeoController],
  providers: [GeoService, SplGeocodeSource, NominatimSource],
  exports: [GeoService],
})
export class GeoModule {}
