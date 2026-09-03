import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EntityRelationDocument = EntityRelation & Document;

@Schema({ collection: 'entity_relations', timestamps: true })
export class EntityRelation {
  @Prop({ required: true, index: true })
  from_type: string;

  @Prop({ required: true, index: true })
  from_id: string;

  @Prop({ required: true, index: true })
  relation: string;

  @Prop({ required: true, index: true })
  to_type: string;

  @Prop({ required: true, index: true })
  to_id: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const EntityRelationSchema = SchemaFactory.createForClass(EntityRelation);
EntityRelationSchema.index({ from_type: 1, from_id: 1, relation: 1 });
EntityRelationSchema.index({ to_type: 1, to_id: 1 });
