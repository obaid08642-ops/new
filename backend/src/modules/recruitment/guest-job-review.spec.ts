import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RecruitmentService } from './recruitment.module';
import { GuestJobReviewDto } from './recruitment.dto';

const lean = (v: unknown) => ({ lean: () => Promise.resolve(v) });

describe('guest job review', () => {
  let svc: RecruitmentService;
  let jobModel: any;

  beforeEach(async () => {
    jobModel = { findOneAndUpdate: jest.fn(), findOne: jest.fn(), find: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        { provide: getModelToken('CandidateProfile'), useValue: {} },
        { provide: getModelToken('JobPosting'), useValue: jobModel },
        { provide: getModelToken('JobApplication'), useValue: {} },
      ],
    }).compile();
    svc = mod.get(RecruitmentService);
  });

  it('publishes only a still-draft guest post (claim-then-act filter)', async () => {
    jobModel.findOneAndUpdate.mockReturnValue(lean({ id: 'j1', status: 'published' }));
    const out = await svc.reviewGuestJob('adm1', 'j1', 'publish', 'ok');
    expect(out.status).toBe('published');
    const [filter, update] = jobModel.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({ id: 'j1', status: 'draft', is_deleted: false });
    expect(filter.guest_device_id).toBeDefined();
    expect(update.$set).toMatchObject({ status: 'published', reviewed_by: 'adm1', review_note: 'ok' });
  });

  it('reject closes the post', async () => {
    jobModel.findOneAndUpdate.mockReturnValue(lean({ id: 'j1', status: 'closed' }));
    await svc.reviewGuestJob('adm1', 'j1', 'reject');
    expect(jobModel.findOneAndUpdate.mock.calls[0][1].$set.status).toBe('closed');
  });

  it('second decision on the same post loses the claim', async () => {
    jobModel.findOneAndUpdate.mockReturnValue(lean(null));
    jobModel.findOne.mockReturnValue(lean({ id: 'j1', status: 'published' }));
    await expect(svc.reviewGuestJob('adm2', 'j1', 'reject')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unknown id is 404', async () => {
    jobModel.findOneAndUpdate.mockReturnValue(lean(null));
    jobModel.findOne.mockReturnValue(lean(null));
    await expect(svc.reviewGuestJob('adm1', 'nope', 'publish')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list defaults to drafts, oldest first, guest posts only', async () => {
    const chain: any = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: () => Promise.resolve([]) };
    jobModel.find.mockReturnValue(chain);
    await svc.listGuestDrafts('whatever');
    expect(jobModel.find.mock.calls[0][0]).toMatchObject({ status: { $eq: 'draft' }, is_deleted: false });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: 1 });
  });

  it('DTO rejects an unknown decision', async () => {
    const bad = plainToInstance(GuestJobReviewDto, { decision: 'delete' });
    expect((await validate(bad)).length).toBeGreaterThan(0);
    const ok = plainToInstance(GuestJobReviewDto, { decision: 'publish', note: 'data checked' });
    expect(await validate(ok)).toHaveLength(0);
  });

  it('DTO needs a reason of 3 to 500 characters for publish and for reject', async () => {
    for (const decision of ['publish', 'reject']) {
      expect((await validate(plainToInstance(GuestJobReviewDto, { decision }))).length).toBeGreaterThan(0);
      expect((await validate(plainToInstance(GuestJobReviewDto, { decision, note: 'ab' }))).length).toBeGreaterThan(0);
      expect((await validate(plainToInstance(GuestJobReviewDto, { decision, note: 'x'.repeat(501) }))).length).toBeGreaterThan(0);
      expect(await validate(plainToInstance(GuestJobReviewDto, { decision, note: 'abc' }))).toHaveLength(0);
    }
  });
});
