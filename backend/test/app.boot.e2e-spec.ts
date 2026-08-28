import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChatModule } from '../src/modules/chat/chat.module';
import { JwtAuthGuard } from '../src/common/auth.guard';
import { EventBusService } from '../src/modules/events/event-bus.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CatalogPublicationService } from '../src/modules/events/catalog-publication.service';

describe('ChatModule application boot', () => {
  let app: INestApplication;

  jest.setTimeout(30_000);

  afterEach(async () => {
    if (app) await app.close();
  });

  it('initializes ChatModule with ChatGateway and ChatService without DI errors', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), ChatModule],
    })
      .overrideProvider('ChatThreadModel').useValue({})
      .overrideProvider('ChatMessageModel').useValue({})
      .overrideProvider('SystemEventModel').useValue({})
      .overrideProvider('SystemEventRepository').useValue({})
      .overrideProvider(EventBusService).useValue({ emit: jest.fn() })
      .overrideProvider(CatalogPublicationService).useValue({ refresh: jest.fn() })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    expect(app.getHttpServer()).toBeDefined();
  });
});
