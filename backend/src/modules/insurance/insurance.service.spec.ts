import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InsuranceService } from './insurance.module';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AiGatewayService } from '../ai/ai-gateway.service';

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
        { provide: AiGatewayService, useValue: { generate: jest.fn() } },
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
    // The simulated-OCR era is over: extraction goes through the real AI
    // gateway and rejects placeholder/invalid images outright.
    it('should reject when no image is provided', async () => {
      await expect(service.ocrExtract({ dummyImage: 'base64' })).rejects.toThrow(BadRequestException);
      await expect(service.ocrExtract({} as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject the old simulated placeholder image', async () => {
      await expect(
        service.ocrExtract({ image_base64: 'base64_simulated_data' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadPolicy', () => {
    it('should reject when provider or policy_number are missing', async () => {
      await expect(service.uploadPolicy({} as any)).rejects.toThrow(BadRequestException);
      await expect(service.uploadPolicy({ provider: 'bupa' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should persist an unverified policy built only from provided data', async () => {
      // Implementation upserts via findOneAndUpdate (not create)
      patientModel.findOneAndUpdate = jest.fn().mockResolvedValue({});
      const res = await service.uploadPolicy(
        { provider: 'bupa', policy_number: 'POL-1', network: 'gold' } as any,
        'p1',
      );
      expect(res.success).toBe(true);
      expect(res.policy.provider).toBe('bupa');
      expect(res.policy.verified).toBe(false);
      expect(patientModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: 'p1' },
        expect.objectContaining({ $set: expect.objectContaining({ insurance: expect.objectContaining({ policy_number: 'POL-1' }) }) }),
        expect.objectContaining({ upsert: true }),
      );
    });
  });

  describe('nphiesEligibility', () => {
    it('should return eligible:false when no stored policy matches', async () => {
      patientModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      const res = await service.nphiesEligibility('1092839482', 'bupa');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('no_matching_policy_on_file');
      expect(res.nphies_live).toBe(false);
    });

    it('should return stored-policy eligibility when the national id matches', async () => {
      patientModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          insurance: {
            national_id: '1092839482',
            provider: 'Bupa Arabia',
            verified: true,
            network: 'gold',
            class: 'A',
            expiry_date: '2027-01-01',
          },
        }),
      });
      const res = await service.nphiesEligibility('1092839482', 'bupa');
      expect(res.eligible).toBe(true);
      expect(res.source).toBe('stored_policy');
      expect(res.nphies_live).toBe(false);
      expect(res.verified).toBe(true);
      expect(res.network).toBe('gold');
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
