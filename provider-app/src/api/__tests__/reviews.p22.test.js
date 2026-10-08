/**
 * P22.7 — review replies: verify the existing POST reviews/:id/reply surface
 * works from the app. INVENTORY: ReviewsSystem.tsx already used the exact
 * backend routes (GET /provider/reviews, POST /provider/reviews/:id/reply
 * { reply }); this task extracts shared helpers WITHOUT changing routes or
 * bodies, and pins them with contract tests. No gaps found — no behaviour change.
 */
const fs = require('fs');
const path = require('path');

const calls = [];

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    get: jest.fn((url) => {
      calls.push({ method: 'GET', url });
      return Promise.resolve({
        data: [{ id: 'r1', author: 'Sara', rating: 5, comment: 'great', reply: null }],
      });
    }),
    post: jest.fn((url, body) => {
      calls.push({ method: 'POST', url, body });
      return Promise.resolve({ data: { ok: true } });
    }),
  },
}));

const api = require('../reviews');

beforeEach(() => {
  calls.length = 0;
  jest.clearAllMocks();
});

describe('P22.7 getMyReviews', () => {
  it('GETs /provider/reviews and returns the list', async () => {
    const rows = await api.getMyReviews();
    expect(calls).toEqual([{ method: 'GET', url: '/provider/reviews' }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('r1');
  });
});

describe('P22.7 replyToReview', () => {
  it('POSTs { reply } to /provider/reviews/:id/reply', async () => {
    await api.replyToReview('r1', '  Thank you!  ');
    expect(calls).toEqual([
      { method: 'POST', url: '/provider/reviews/r1/reply', body: { reply: 'Thank you!' } },
    ]);
  });

  it('rejects empty replies before any network call', async () => {
    await expect(api.replyToReview('r1', '   ')).rejects.toThrow('reply_text_required');
    expect(calls).toEqual([]);
  });

  it('requires a review id', async () => {
    await expect(api.replyToReview('', 'hi')).rejects.toThrow('review_id_required');
    expect(calls).toEqual([]);
  });
});

describe('P22.7 ReviewsSystem wiring (structural)', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../screens/shared/shared/ReviewsSystem.tsx'),
    'utf8',
  );

  it('screen goes through the shared helpers (same verified routes)', () => {
    expect(src).toContain('getMyReviews');
    expect(src).toContain('replyToReview');
    expect(src).not.toContain('/provider/reviews/${id}/reply');
    expect(src).not.toContain("client.get('/provider/reviews')");
  });
});
