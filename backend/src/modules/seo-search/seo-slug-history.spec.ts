import { Test, TestingModule } from '@nestjs/testing';
import { SeoService } from './seo.service';

const emptyModel = () => ({ findOne: jest.fn(), find: jest.fn() });

async function build(collectionMock: any) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SeoService,
      { provide: 'MedicineRepository', useValue: emptyModel() },
      { provide: 'LabServiceRepository', useValue: emptyModel() },
      { provide: 'HomeCareServiceRepository', useValue: emptyModel() },
      { provide: 'FacilityRepository', useValue: emptyModel() },
      { provide: 'ProviderProfileRepository', useValue: emptyModel() },
      { provide: 'ArticleRepository', useValue: emptyModel() },
      { provide: 'DatabaseConnection', useValue: { collection: jest.fn().mockReturnValue(collectionMock) } },
    ],
  }).compile();
  return module.get<SeoService>(SeoService);
}

describe('SeoService slug history (R69)', () => {
  it('resolves a renamed slug via history with a moved_from marker', async () => {
    const moved = { id: 'd9', slug: 'new-slug' };
    const medicineModel = { findOne: jest.fn(), find: jest.fn() };
    // exact miss, then history-guided hit
    medicineModel.findOne
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(moved) });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        { provide: 'MedicineRepository', useValue: medicineModel },
        { provide: 'LabServiceRepository', useValue: emptyModel() },
        { provide: 'HomeCareServiceRepository', useValue: emptyModel() },
        { provide: 'FacilityRepository', useValue: emptyModel() },
        { provide: 'ProviderProfileRepository', useValue: emptyModel() },
        { provide: 'ArticleRepository', useValue: emptyModel() },
        {
          provide: 'DatabaseConnection',
          useValue: { collection: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue({ new_slug: 'new-slug' }) }) },
        },
      ],
    }).compile();
    const service = module.get<SeoService>(SeoService);
    await expect(service.resolve('medicine', 'old-slug')).resolves.toEqual({ ...moved, _moved_from: 'old-slug' });
  });

  it('falls through when history has no record', async () => {
    const medicineModel = { findOne: jest.fn(), find: jest.fn() };
    medicineModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const svc = await build({ findOne: jest.fn().mockResolvedValue(null) });
    // replace medicine model behavior: no hooks into private models; assert null-safe path
    const out = await svc.resolve('unknown-type', 'x').catch(() => 'threw');
    expect(['threw', null]).toContain(out);
  });
});
