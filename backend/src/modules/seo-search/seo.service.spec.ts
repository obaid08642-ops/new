import { Test, TestingModule } from '@nestjs/testing';
import { SeoService } from './seo.service';

const findChain = (rows: any[] = []) => ({
  lean: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(rows) }),
});

describe('SeoService public discovery governance', () => {
  let service: SeoService;
  let medicineModel: any;
  let providerModel: any;
  let labModel: any;
  let homeCareModel: any;
  let facilityModel: any;
  let articleModel: any;

  beforeEach(async () => {
    medicineModel = { findOne: jest.fn(), find: jest.fn() };
    providerModel = { findOne: jest.fn(), find: jest.fn() };
    labModel = { findOne: jest.fn(), find: jest.fn() };
    homeCareModel = { findOne: jest.fn(), find: jest.fn() };
    facilityModel = { findOne: jest.fn(), find: jest.fn() };
    articleModel = { findOne: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        { provide: 'MedicineRepository', useValue: medicineModel },
        { provide: 'LabServiceRepository', useValue: labModel },
        { provide: 'HomeCareServiceRepository', useValue: homeCareModel },
        { provide: 'FacilityRepository', useValue: facilityModel },
        { provide: 'ProviderProfileRepository', useValue: providerModel },
        { provide: 'ArticleRepository', useValue: articleModel },
        { provide: 'DatabaseConnection', useValue: { collection: jest.fn().mockReturnValue({ find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }) } },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
  });

  it('resolves medicines only from the reviewed public set', async () => {
    const medicine = { id: 'm1', name_ar: 'بنادول', slug: 'panadol-slug' };
    medicineModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(medicine) });

    await expect(service.resolve('medicine', 'panadol-slug')).resolves.toEqual(medicine);
    expect(medicineModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'panadol-slug',
        public_eligibility: true,
        medical_review_status: 'approved',
        active: { $ne: false },
      }),
      expect.any(Object),
    );
  });

  it('does not create a public share link for an unreviewed medicine', async () => {
    medicineModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(service.buildShareLink('medicine', 'm1')).resolves.toEqual({ ok: false, reason: 'not_found' });
    expect(medicineModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', public_eligibility: true, medical_review_status: 'approved' }),
      expect.any(Object),
    );
  });

  it('writes only explicitly index-eligible medicines to the sitemap', async () => {
    medicineModel.find.mockReturnValue(findChain([{ id: 'm1', name_ar: 'بنادول', updatedAt: new Date('2026-08-20T00:00:00Z') }]));
    providerModel.find.mockReturnValue(findChain());
    labModel.find.mockReturnValue(findChain());
    homeCareModel.find.mockReturnValue(findChain());
    facilityModel.find.mockReturnValue(findChain());
    articleModel.find.mockReturnValue(findChain());

    const xml = await service.sitemap();

    expect(medicineModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        public_eligibility: true,
        medical_review_status: 'approved',
        indexing_eligibility: true,
      }),
      expect.any(Object),
    );
    expect(xml).toContain('/s/medicine/');
  });

  it('requires index eligibility before an IndexNow notification', async () => {
    medicineModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(service.pingIndexNow('medicine', 'm1')).resolves.toEqual({ ok: false });
    expect(medicineModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', public_eligibility: true, indexing_eligibility: true }),
      expect.any(Object),
    );
  });
});
