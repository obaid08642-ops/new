// 91681c2 / 1a6a8eb: 13.R9 asks for ONE ranking API. A second ranking system
// (DynamicRankingR9Service + GET /medicines/ranking-r9) was added beside
// ProductRankingService: its recordEvent had no caller (empty ZSets) and its
// route was shadowed by GET /medicines/:id (live 404). It is removed; the
// module serves exactly the one ranking service and its event recorder.
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ProductRankingModule } from './product-ranking.module';
import { ProductRankingService } from './product-ranking.service';
import { ProductRankingEventService } from './product-ranking-event.service';
import { ProductRankingController } from './product-ranking.controller';
import { ManualBoostsService } from './manual-boosts.service';
import { ManualBoostsController } from './manual-boosts.controller';

describe('ProductRankingModule exposes one ranking API (13.R9)', () => {
  const meta = (key: string) => Reflect.getMetadata(key, ProductRankingModule) as unknown[];

  it('provides only the one ranking service, its event recorder and manual boosts', () => {
    expect(meta(MODULE_METADATA.PROVIDERS)).toEqual([ProductRankingService, ProductRankingEventService, ManualBoostsService]);
    expect(meta(MODULE_METADATA.EXPORTS)).toEqual([ProductRankingService, ProductRankingEventService, ManualBoostsService]);
  });

  it('registers no second ranking route beside the ranking controller', () => {
    expect(meta(MODULE_METADATA.CONTROLLERS)).toEqual([ProductRankingController, ManualBoostsController]);
  });
});
