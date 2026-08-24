import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RecruitmentService } from './recruitment.module';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let candidateModel: any;
  let jobModel: any;
  let appModel: any;

  beforeEach(async () => {
    candidateModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    jobModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    appModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        { provide: getModelToken('CandidateProfile'), useValue: candidateModel },
        { provide: getModelToken('JobPosting'), useValue: jobModel },
        { provide: getModelToken('JobApplication'), useValue: appModel },
      ],
    }).compile();

    service = module.get<RecruitmentService>(RecruitmentService);
  });

  describe('upsertCandidateProfile', () => {
    it('should create a new candidate profile if none exists', async () => {
      candidateModel.findOne.mockResolvedValue(null);
      candidateModel.create.mockResolvedValue({
        toObject: () => ({ id: 'c1', user_id: 'u1', cv_url: 'https://cv.pdf' })
      });

      const res = await service.upsertCandidateProfile('u1', {
        cv_url: 'https://cv.pdf',
        scfhs_license_number: '12-345',
        scfhs_license_expiry: new Date(),
      });

      expect(res.id).toBe('c1');
      expect(candidateModel.create).toHaveBeenCalled();
    });

    it('should update profile if it exists', async () => {
      const mockProfile = {
        user_id: 'u1',
        cv_url: 'https://old.pdf',
        save: jest.fn(),
        toObject: () => ({ user_id: 'u1', cv_url: 'https://new.pdf' })
      };
      candidateModel.findOne.mockResolvedValue(mockProfile);

      const res = await service.upsertCandidateProfile('u1', { cv_url: 'https://new.pdf' });
      expect(res.cv_url).toBe('https://new.pdf');
      expect(mockProfile.save).toHaveBeenCalled();
    });
  });

  describe('applyForJob', () => {
    it('should throw BadRequestException if candidate profile does not exist', async () => {
      candidateModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });
      await expect(service.applyForJob('u1', 'j1', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if job does not exist or is not published', async () => {
      candidateModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'c1' })
      });
      jobModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(service.applyForJob('u1', 'j1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already applied', async () => {
      candidateModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'c1' })
      });
      jobModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'j1', status: 'published' })
      });
      appModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'a1' })
      });

      await expect(service.applyForJob('u1', 'j1', {})).rejects.toThrow(BadRequestException);
    });

    it('should create application if profile exists and not applied', async () => {
      candidateModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'c1' })
      });
      jobModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'j1', status: 'published' })
      });
      appModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });
      appModel.create.mockResolvedValue({
        toObject: () => ({ id: 'a1', job_id: 'j1', candidate_id: 'c1' })
      });

      const res = await service.applyForJob('u1', 'j1', { cover_letter: 'hello' });
      expect(res.id).toBe('a1');
      expect(appModel.create).toHaveBeenCalled();
    });
  });

  describe('updateApplicationStatus', () => {
    it('should update status if requester is the facility/employer', async () => {
      const mockApp = {
        id: 'a1',
        job_id: 'j1',
        status: 'submitted',
        save: jest.fn(),
        toObject: () => ({ id: 'a1', status: 'interviewing' })
      };
      appModel.findOne.mockResolvedValue(mockApp);
      jobModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'j1', facility_id: 'f1' })
      });

      const res = await service.updateApplicationStatus('a1', 'f1', 'hospital', 'interviewing');
      expect(res.status).toBe('interviewing');
      expect(mockApp.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if requester is not authorized', async () => {
      appModel.findOne.mockResolvedValue({ id: 'a1', job_id: 'j1' });
      jobModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'j1', facility_id: 'f1' })
      });

      await expect(
        service.updateApplicationStatus('a1', 'different_user', 'doctor', 'interviewing')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
