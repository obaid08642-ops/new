import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let medicineModel: any;
  let providerModel: any;

  beforeEach(async () => {
    medicineModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    providerModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        { provide: 'MedicineRepository', useValue: medicineModel },
        { provide: 'LabServiceRepository', useValue: {} },
        { provide: 'HomeCareServiceRepository', useValue: {} },
        { provide: 'FacilityRepository', useValue: {} },
        { provide: 'ProviderProfileRepository', useValue: providerModel },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
  });

  describe('resolve', () => {
    it('should find entity by exact slug match first', async () => {
      const mockMed = { id: 'm1', name_ar: 'بنادول', slug: 'panadol-slug' };
      medicineModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMed),
      });

      const res = await service.resolve('medicine', 'panadol-slug');
      expect(res).toEqual(mockMed);
      expect(medicineModel.findOne).toHaveBeenCalledWith(
        { slug: 'panadol-slug', is_deleted: { $ne: true } },
        expect.any(Object)
      );
    });

    it('should fall back to id suffix lookup if exact slug not found', async () => {
      medicineModel.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(null), // first call (exact slug)
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({ id: 'abcdef123', name_ar: 'بنادول' }), // second call (id suffix)
        });

      const res: any = await service.resolve('medicine', 'panadol-abcdef');
      expect(res.id).toBe('abcdef123');
      expect(medicineModel.findOne).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: { $regex: expect.any(RegExp) } }),
        expect.any(Object)
      );
    });
  });
});
