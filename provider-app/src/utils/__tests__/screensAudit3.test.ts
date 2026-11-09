import { toReview, toReviews } from '../reviews';
import { durationDays } from '../../screens/doctor/doctor/EPrescriptionScreen';

describe('reviews as the screens read them', () => {
  it('maps the raw rating row (score, user_name, createdAt, status)', () => {
    const r = toReview({ id: 'r1', score: 4, user_name: 'Sara', createdAt: '2026-10-20T10:00:00Z', comment: 'good', status: 'published', reply: 'thanks' });
    expect(r).toMatchObject({ id: 'r1', rating: 4, author: 'Sara', comment: 'good', reply: 'thanks', canReply: true });
    expect(r.date).not.toBe('');
  });
  it('a pending or rejected review cannot be answered (the server refuses it)', () => {
    expect(toReview({ id: 'a', score: 5, status: 'pending' }).canReply).toBe(false);
    expect(toReview({ id: 'b', score: 5, status: 'rejected' }).canReply).toBe(false);
    expect(toReview({ id: 'c', score: 5 }).canReply).toBe(true);
  });
  it('accepts an array or { items } and drops rows without an id', () => {
    expect(toReviews([{ id: 'a', score: 3 }, { score: 2 }])).toHaveLength(1);
    expect(toReviews({ items: [{ id: 'a', score: 3 }] })).toHaveLength(1);
    expect(toReviews(null)).toEqual([]);
  });
});

describe('prescription duration chips', () => {
  it('turns every offered chip into a number of days', () => {
    expect(durationDays('3 أيام')).toBe(3);
    expect(durationDays('10 days')).toBe(10);
    expect(durationDays('أسبوعين')).toBe(14);
    expect(durationDays('2 weeks')).toBe(14);
    expect(durationDays('شهر')).toBe(30);
    expect(durationDays('1 month')).toBe(30);
  });
  it('is 0 for text that is not a duration', () => {
    expect(durationDays('Ongoing')).toBe(0);
    expect(durationDays('')).toBe(0);
  });
});
