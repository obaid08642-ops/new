import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LocationDocument = Location & Document;

export type LocationType = 'country' | 'region' | 'city' | 'district' | 'sub_area';

@Schema({ _id: false })
export class LocationCoordinates {
  @Prop({ type: Number, required: false })
  lat?: number;

  @Prop({ type: Number, required: false })
  lng?: number;
}

@Schema({ _id: false })
export class LocationCoverage {
  @Prop({ type: Boolean, default: true })
  pharmacy_delivery: boolean;

  @Prop({ type: Boolean, default: true })
  home_healthcare: boolean;

  @Prop({ type: Boolean, default: true })
  lab_collection: boolean;
}

@Schema({ collection: 'locations', timestamps: true })
export class Location {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true, index: true })
  name_ar: string;

  @Prop({ required: true, index: true })
  name_en: string;

  @Prop({
    required: true,
    enum: ['country', 'region', 'city', 'district', 'sub_area'],
    index: true,
  })
  type: LocationType;

  @Prop({ type: String, default: null, index: true })
  parent_code?: string | null;

  @Prop({ type: [String], default: [], index: true })
  aliases: string[];

  @Prop({ type: LocationCoordinates, required: false })
  coordinates?: LocationCoordinates;

  @Prop({ type: LocationCoverage, default: () => ({ pharmacy_delivery: true, home_healthcare: true, lab_collection: true }) })
  coverage: LocationCoverage;

  @Prop({ type: Boolean, default: true, index: true })
  is_active: boolean;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

LocationSchema.index({ name_ar: 'text', name_en: 'text', aliases: 'text' });
LocationSchema.index({ type: 1, parent_code: 1, is_active: 1 });
