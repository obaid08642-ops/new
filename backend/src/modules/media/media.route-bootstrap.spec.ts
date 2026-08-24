import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaAsset } from './media.schema';
import { JwtAuthGuard } from '../../common/auth.guard';

describe('MediaController route bootstrap', () => {
  it('registers the named wildcard delete route without a path-to-regexp error', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: {} },
        { provide: getModelToken(MediaAsset.name), useValue: {} },
        { provide: getConnectionToken(), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const app = moduleRef.createNestApplication();
    await expect(app.init()).resolves.toBeDefined();
    await app.close();
  });
});
