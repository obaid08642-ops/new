import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InsuranceService } from './insurance.module';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InsuranceService', () => {
  let service: InsuranceService;
  let companyModel: any;
  let networkModel: any;
  let ruleModel: any;
  let providerModel: any;
  let facilityModel: any;
  let patientModel: any;

  beforeEach(async () => {
    companyModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    networkModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    ruleModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    providerModel = {
      findOne: jest.fn(),
    };

    facilityModel = {
      findOne: jest.fn(),
    };

    patientModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: getModelToken('InsuranceClaim'), useValue: {} },
        InsuranceService,
        { provide: getModelToken('InsuranceCompany'), useValue: companyModel },
        { provide: getModelToken('InsuranceNetwork'), useValue: networkModel },
        { provide: getModelToken('CoverageRule'), useValue: ruleModel },
        { provide: getModelToken('ProviderProfile'), useValue: providerModel },
        { provide: getModelToken('Facility'), useValue: facilityModel },
        { provide: getModelToken('PatientProfile'), useValue: patientModel },
      ],
    }).compile();

    service = module.get<InsuranceService>(InsuranceService);
  });

  describe('checkCoverage', () => {
    it('should return covered: false if patient has no insurance profile', async () => {
      patientModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await service.checkCoverage('p1', { service_type: 'consultation' });
      expect(res.covered).toBe(false);
      expect(res.reason).toContain('no registered insurance');
    });

    it('should return covered: false if provider does not accept patient insurance company/network', async () => {
      patientModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          user_id: 'p1',
          insurance: { provider: 'bupa', network: 'gold', policy_number: '123', class: 'A' },
        }),
      });

      providerModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          id: 'doc1',
          name_ar: 'د. خالد',
          insurance_contracts: [
            {
              company_id: 'tawuniya',
              company_name_ar: 'التعاونية',
              company_name_en: 'Tawuniya',
              network_id: 'silver',
              network_name_ar: 'الفئة الفضية',
              network_name_en: 'Silver Network',
              covered_classes: ['A'],
              copay_percent: 10,
              copay_flat: 10,
            },
          ],
        }),
      });

      const res = await service.checkCoverage('p1', {
        provider_id: 'doc1',
        service_type: 'consultation',
      });

      expect(res.covered).toBe(false);
      expect(res.reason).toContain('does not accept patient\'s insurance');
    });

    it('should return covered: true with base contract details if no coverage rules are configured', async () => {
      patientModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          user_id: 'p1',
          insurance: { provider: 'bupa', network: 'gold', policy_number: '123', class: 'A' },
        }),
      });

      providerModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          id: 'doc1',
          name_ar: 'د. خالد',
          insurance_contracts: [
            {
              company_id: 'bupa',
              company_name_ar: 'بوبا',
              company_name_en: 'Bupa',
              network_id: 'gold',
              network_name_ar: 'الذهبية',
              network_name_en: 'Gold',
              covered_classes: ['A'],
              copay_percent: 15,
              copay_flat: 20,
            },
          ],
        }),
      });

      networkModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null), // no network details => no rules evaluated
      });

      const res = await service.checkCoverage('p1', {
        provider_id: 'doc1',
        service_type: 'consultation',
      });

      expect(res.covered).toBe(true);
      expect(res.copay_percent).toBe(15);
      expect(res.copay_flat).toBe(20);
    });

    it('should override with specific coverage rules if matches service_type', async () => {
      patientModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          user_id: 'p1',
          insurance: { provider: 'bupa', network: 'gold', policy_number: '123', class: 'A' },
        }),
      });

      providerModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          id: 'doc1',
          name_ar: 'د. خالد',
          insurance_contracts: [
            {
              company_id: 'bupa',
              company_name_ar: 'بوبا',
              company_name_en: 'Bupa',
              network_id: 'gold',
              network_name_ar: 'الذهبية',
              network_name_en: 'Gold',
              covered_classes: ['A'],
              copay_percent: 15,
              copay_flat: 50,
            },
          ],
        }),
      });

      networkModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'net1', company_id: 'bupa', code: 'gold' }),
      });

      ruleModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            network_id: 'net1',
            service_type: 'consultation',
            service_key: 'cardiology',
            copay_percent: 5,
            copay_flat_limit: 10,
            requires_preauth: true,
          },
        ]),
      });

      const res = await service.checkCoverage('p1', {
        provider_id: 'doc1',
        service_type: 'consultation',
        service_key: 'cardiology',
      });

      expect(res.covered).toBe(true);
      expect(res.copay_percent).toBe(5);
      expect(res.copay_flat).toBe(10); // min of rule limit and contract flat
      expect(res.requires_preauth).toBe(true);
    });
  });

  describe('ocrExtract', () => {
    it('should extract metadata from an uploaded image', async () => {
      const res = await service.ocrExtract({ dummyImage: 'base64' });
      expect(res.success).toBe(true);
      expect(res.extracted_data.provider).toBe('bupa');
      expect(res.extracted_data.class).toBe('A');
    });
  });

  describe('uploadPolicy', () => {
    it('should extract metadata from an uploaded PDF', async () => {
      const res = await service.uploadPolicy({ dummyPdf: 'base64' });
      expect(res.success).toBe(true);
      expect(res.policy.provider).toBe('tawuniya');
      expect(res.policy.class).toBe('B');
    });
  });

  describe('nphiesEligibility', () => {
    it('should return eligibility and copay information', async () => {
      const res = await service.nphiesEligibility('1092839482', 'bupa');
      expect(res.eligible).toBe(true);
      expect(res.copay_percent).toBe(10);
      expect(res.copay_flat).toBe(15);
    });

    it('should throw BadRequestException if arguments are missing', async () => {
      await expect(service.nphiesEligibility('', '')).rejects.toThrow(BadRequestException);
    });
  });

  describe('savePolicy', () => {
    it('should save/update insurance policy on patient profile', async () => {
      const mockPatient = {
        user_id: 'p1',
        insurance: null,
        save: jest.fn().mockResolvedValue(true),
      };
      patientModel.findOne.mockResolvedValue(mockPatient);

      const policyData = {
        provider: 'bupa',
        policy_number: 'BPA-1111',
        network: 'gold',
        class: 'A',
        expiry_date: '2027-12-31',
        member_name: 'Ahmed',
        national_id: '11111',
        verified: true,
      };

      const res = await service.savePolicy('p1', policyData);
      expect(res.success).toBe(true);
      expect(mockPatient.insurance).toEqual(expect.objectContaining({
        provider: 'bupa',
        policy_number: 'BPA-1111',
        verified: true,
      }));
    });
  });
});
