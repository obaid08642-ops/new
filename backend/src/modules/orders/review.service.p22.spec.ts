import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service';

function chain<T>(value: T): any {
  return { lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }) };
}

function listQuery<T>(value: T): any {
  const c = chain(value);
  return {
    sort: jest.fn().mockReturnValue(c),
    limit: jest.fn().mockReturnValue(c),
    lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
  };
}

function mutable(doc: any): any {
  return { ...doc, save: jest.fn().mockResolvedValue(true) };
}

function setup(opts: {
  legacyOrder?: any;
  governedOrder?: any;
  booking?: any;
  consultation?: any;
  existing?: any;
  reviewDoc?: any;
  reviewList?: any[];
} = {}) {
  const orders = { findOne: jest.fn().mockReturnValue(chain(opts.legacyOrder ?? null)) };
  const findOneByName = jest.fn(async (filter: any) => {
    void filter;
    return null;
  });
  const pharmacyFindOne = jest.fn().mockResolvedValue(opts.governedOrder ?? null);
  const appointmentsFindOne = jest.fn().mockResolvedValue(opts.booking ?? null);
  const consultationFindOne = jest.fn().mockResolvedValue(opts.consultation ?? null);
  void findOneByName;
  const conn = {
    collection: jest.fn((name: string) => {
      if (name === 'pharmacy_orders') return { findOne: pharmacyFindOne };
      if (name === 'appointments') return { findOne: appointmentsFindOne };
      if (name === 'consultation_bookings') return { findOne: consultationFindOne };
      return { findOne: jest.fn().mockResolvedValue(null) };
    }),
  };

  const ReviewModel: any = jest.fn().mockImplementation((data: any) => mutable({ ...data, _id: 'rev-1' }));
  ReviewModel.findOne = jest.fn().mockReturnValue(chain(opts.existing ?? null));
  ReviewModel.findById = jest.fn().mockResolvedValue(opts.reviewDoc ? mutable(opts.reviewDoc) : null);
  ReviewModel.find = jest.fn().mockReturnValue(listQuery(opts.reviewList ?? []));

  const svc = new ReviewService(ReviewModel as never, orders as never, conn as never);
  return { svc, orders, ReviewModel, conn };
}

const baseDto = {
  source_type: 'order' as const,
  source_id: 'ord-1',
  provider_id: 'ph-1',
  provider_type: 'pharmacy' as const,
  rating: 5,
  comment: 'Great service',
};

describe('ReviewService.create (P22)', () => {
  it('creates a review from a delivered legacy order', async () => {
    const { svc, ReviewModel } = setup({ legacyOrder: { id: 'ord-1', patient_id: 'patient-1', state: 'delivered' } });
    const rev = await svc.create('patient-1', baseDto);
    expect(rev).toMatchObject({ patient_id: 'patient-1', rating: 5, status: 'published' });
    expect(ReviewModel).toHaveBeenCalledWith(expect.objectContaining({ source_id: 'ord-1' }));
  });

  it('creates a review from a delivered governed order when legacy is missing', async () => {
    const { svc } = setup({
      legacyOrder: null,
      governedOrder: { id: 'ord-1', patient_account_id: 'patient-1', state: 'delivered' },
    });
    const rev = await svc.create('patient-1', baseDto);
    expect(rev).toMatchObject({ status: 'published' });
  });

  it('rejects reviews when the source is not completed or not yours', async () => {
    const { svc } = setup({ legacyOrder: { id: 'ord-1', patient_id: 'patient-1', state: 'created' }, governedOrder: null });
    await expect(svc.create('patient-1', baseDto)).rejects.toBeInstanceOf(BadRequestException);

    const foreign = setup({ legacyOrder: null, governedOrder: null });
    await expect(foreign.svc.create('patient-2', baseDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents duplicate reviews for the same source', async () => {
    const { svc } = setup({
      legacyOrder: { id: 'ord-1', patient_id: 'patient-1', state: 'delivered' },
      existing: { _id: 'rev-0' },
    });
    await expect(svc.create('patient-1', baseDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates rating bounds and the 5-photo cap', async () => {
    const { svc } = setup({ legacyOrder: { id: 'ord-1', patient_id: 'patient-1', state: 'delivered' } });
    await expect(svc.create('patient-1', { ...baseDto, rating: 6 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('patient-1', { ...baseDto, photos: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ReviewService.providerReply (P22)', () => {
  it('lets the owning provider reply once', async () => {
    const { svc } = setup({ reviewDoc: { _id: 'rev-1', provider_id: 'ph-1' } });
    const out: any = await svc.providerReply('rev-1', 'ph-1', { content: 'Thanks!', replied_by: 'staff-1' });
    expect(out.provider_reply).toMatchObject({ content: 'Thanks!', replied_by: 'staff-1' });
    expect(out.save).toHaveBeenCalledTimes(1);
  });

  it('blocks a second reply and foreign providers', async () => {
    const replied = setup({ reviewDoc: { _id: 'rev-1', provider_id: 'ph-1', provider_reply: { content: 'x' } } });
    await expect(replied.svc.providerReply('rev-1', 'ph-1', { content: 'again', replied_by: 's' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const { svc } = setup({ reviewDoc: { _id: 'rev-1', provider_id: 'ph-1' } });
    await expect(svc.providerReply('rev-1', 'ph-2', { content: 'hijack', replied_by: 's' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const missing = setup({ reviewDoc: null });
    await expect(missing.svc.providerReply('rev-9', 'ph-1', { content: 'x', replied_by: 's' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('ReviewService.moderate (P22)', () => {
  it.each([
    ['approve', 'published'],
    ['reject', 'rejected'],
    ['hide', 'hidden'],
  ])('%s transitions status to %s', async (action, expected) => {
    const { svc } = setup({ reviewDoc: { _id: 'rev-1', status: 'published' } });
    const out: any = await svc.moderate('rev-1', { action: action as 'approve' | 'reject' | 'hide', moderator_id: 'mod-1', reason: 'spam' });
    expect(out.status).toBe(expected);
    expect(out.moderation).toMatchObject({ moderator_id: 'mod-1', reason: 'spam' });
    expect(out.save).toHaveBeenCalledTimes(1);
  });

  it('404s on unknown reviews', async () => {
    const { svc } = setup({ reviewDoc: null });
    await expect(svc.moderate('rev-9', { action: 'hide', moderator_id: 'mod-1' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReviewService.helpful votes (P22)', () => {
  it('records a helpful vote and allows unvote', async () => {
    const { svc } = setup({ reviewDoc: { _id: 'rev-1', patient_id: 'patient-1', helpful_voters: [], helpful_votes: 0 } });
    const voted: any = await svc.voteHelpful('rev-1', 'patient-2');
    expect(voted.helpful_voters).toEqual(['patient-2']);
    expect(voted.helpful_votes).toBe(1);

    const unvoted: any = await svc.removeHelpfulVote('rev-1', 'patient-2');
    expect(unvoted.helpful_votes).toBe(0);
  });

  it('blocks self-votes, double votes and unvote-without-vote', async () => {
    const own = setup({ reviewDoc: { _id: 'rev-1', patient_id: 'patient-1', helpful_voters: [] } });
    await expect(own.svc.voteHelpful('rev-1', 'patient-1')).rejects.toBeInstanceOf(BadRequestException);

    const twice = setup({ reviewDoc: { _id: 'rev-1', patient_id: 'patient-1', helpful_voters: ['patient-2'] } });
    await expect(twice.svc.voteHelpful('rev-1', 'patient-2')).rejects.toBeInstanceOf(BadRequestException);
    await expect(twice.svc.removeHelpfulVote('rev-1', 'patient-3')).rejects.toBeInstanceOf(BadRequestException);

    const missing = setup({ reviewDoc: null });
    await expect(missing.svc.voteHelpful('rev-9', 'patient-2')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReviewService.getProviderRating (P22)', () => {
  it('aggregates average, count and distribution', async () => {
    const { svc, ReviewModel } = setup({ reviewList: [{ rating: 5 }, { rating: 4 }, { rating: 5 }] });
    await expect(svc.getProviderRating('ph-1', 'pharmacy')).resolves.toEqual({
      average: 4.7,
      count: 3,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
    });
    expect(ReviewModel.find).toHaveBeenCalledWith({ provider_id: 'ph-1', provider_type: 'pharmacy', status: 'published' });
  });

  it('returns zeros when there are no published reviews', async () => {
    const { svc } = setup({ reviewList: [] });
    await expect(svc.getProviderRating('ph-1', 'pharmacy')).resolves.toEqual({
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });
});
