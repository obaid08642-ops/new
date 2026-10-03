import { INestApplication, Global, Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ChatModule } from '../src/modules/chat/chat.module';
import { JwtAuthGuard } from '../src/common/auth.guard';
import { EventBusService } from '../src/modules/events/event-bus.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CatalogPublicationService } from '../src/modules/events/catalog-publication.service';
import { AutoEntitySeoPipelineService } from '../src/modules/events/auto-entity-seo-pipeline.service';

/**
 * The real AppModule calls MongooseModule.forRoot(), which registers the
 * connection globally. This test boots ChatModule on its own, so it needs an
 * equivalent global provider for every @InjectConnection() in the graph.
 */
const CONNECTION = {
  collection: () => ({ find: () => ({ toArray: async () => [] }), findOne: () => ({ lean: async () => null }) }),
};

@Global()
@Module({
  providers: [{ provide: getConnectionToken(), useValue: CONNECTION }],
  exports: [getConnectionToken()],
})
class TestConnectionModule {}

describe('ChatModule application boot', () => {
  let app: INestApplication;

  jest.setTimeout(30_000);

  afterEach(async () => {
    if (app) await app.close();
  });

  it('initializes ChatModule with ChatGateway and ChatService without DI errors', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), TestConnectionModule, ChatModule],
    })
      .overrideProvider('ChatThreadModel').useValue({})
      .overrideProvider('ChatMessageModel').useValue({})
      .overrideProvider('SystemEventModel').useValue({})
      .overrideProvider('SystemEventRepository').useValue({})
      .overrideProvider(EventBusService).useValue({ emit: jest.fn() })
      .overrideProvider(CatalogPublicationService).useValue({ refresh: jest.fn() })
      // AutoEntitySeoPipelineService injects the mongoose connection, which only
      // the root AppModule provides. This test boots ChatModule alone, so stub it
      // the same way its EventBusService/CatalogPublicationService siblings are.
      .overrideProvider(AutoEntitySeoPipelineService).useValue({})
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    expect(app.getHttpServer()).toBeDefined();
  });
});
