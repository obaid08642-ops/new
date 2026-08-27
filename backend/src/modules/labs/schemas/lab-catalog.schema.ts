import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LabCatalogDocument = LabCatalog & Document;

@Schema({ timestamps: true })
export class LabCatalog {
  @Prop({ type: String, required: true, index: true })
  lab_id: string; // The lab this catalog belongs to

  @Prop({ required: true, unique: true, index: true })
  test_code: string; // e.g., 'LAB-CBC'

  @Prop({ required: true })
  test_name_ar: string; // e.g., 'صورة دم كاملة (CBC)'

  @Prop({ required: true })
  test_name_en: string;

  @Prop({ required: true, default: 0 })
  in_lab_price: number;

  @Prop({ required: true, default: 0 })
  home_collection_price: number;

  @Prop({ required: true, default: false })
  accepts_insurance: boolean;

  @Prop({
    type: [{
      parameter_name: { type: String, required: true }, // e.g. 'WBC', 'Hemoglobin'
      min_bounds: { type: Number, required: true },
      max_bounds: { type: Number, required: true },
      unit_string: { type: String, required: true } // e.g. 'g/dL'
    }],
    default: []
  })
  reference_ranges: any[];
}

export const LabCatalogSchema = SchemaFactory.createForClass(LabCatalog);
