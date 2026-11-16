import { ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AiContentReviewController } from './ai-content-review.controller';

/** The human side of the AI content review queue: admin only, and the decision is attributed to the signed-in reviewer. */
describe('AiContentReviewController', () => {
  const review = { list: jest.fn(async () => []), review: jest.fn(async () => ({ ok: true })) };
  const controller = new AiContentReviewController(review as any);

  it('the whole controller is restricted to the ADMIN role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AiContentReviewController)).toEqual([UserRole.ADMIN]);
  });

  it('list passes the status filter and a numeric limit (50 when missing or not a number)', async () => {
    await controller.list('pending', '10');
    expect(review.list).toHaveBeenLastCalledWith('pending', 10);
    await controller.list(undefined, undefined);
    expect(review.list).toHaveBeenLastCalledWith(undefined, 50);
    await controller.list('pending', 'abc');
    expect(review.list).toHaveBeenLastCalledWith('pending', 50);
  });

  it('a decision is recorded for the signed-in reviewer with the decision and the note', async () => {
    await controller.decide({ id: 'admin-1' }, 'item-9', { decision: 'approved', note: 'ok' } as any);
    expect(review.review).toHaveBeenCalledWith('item-9', 'admin-1', 'approved', 'ok');
  });
});
