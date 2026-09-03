import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Condition, ConditionSchema } from './schemas/condition.schema';
import { EntityRelation, EntityRelationSchema } from './schemas/entity-relation.schema';
import { EntityGraphService } from './entity-graph.service';
import { EntityGraphController } from './entity-graph.controller';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Condition.name, schema: ConditionSchema },
      { name: EntityRelation.name, schema: EntityRelationSchema },
    ]),
    LocationModule,
  ],
  controllers: [EntityGraphController],
  providers: [EntityGraphService],
  exports: [EntityGraphService],
})
export class EntityGraphModule {}
