import { describe, expect, it } from 'vitest';
import { AdminApiError } from '@/lib/admin-client';
import { approveErrorMessage, BRAND_NOT_ALLOWED_MESSAGE, reviewArticle, reviewList } from './article-review';

describe('article review helpers', () => {
  it('reads list rows and the full article', () => {
    expect(reviewList([{ id: 'a', title_ar: 'عنوان', author: { doctor_id: 'd1' }, createdAt: '2026-10-10T10:00:00Z' }, { nope: 1 }])).toHaveLength(1);
    expect(reviewArticle({ id: 'a', title_ar: 'ع', body_ar: 'نص' })?.body).toBe('نص');
    expect(reviewList(null)).toEqual([]);
    expect(reviewArticle({ id: 'a', author: { doctor_id: 'd1', doctor_name: 'د. واحد' } })).toMatchObject({ doctorId: 'd1', doctorName: 'د. واحد' });
  });
  it('shows a clear message for prescription_brand_not_allowed', () => {
    const err = new AdminApiError(400, { message: 'prescription_brand_not_allowed' });
    expect(approveErrorMessage(err)).toBe(BRAND_NOT_ALLOWED_MESSAGE);
    expect(approveErrorMessage(new AdminApiError(400, { message: 'other' }))).toBe('other');
  });
});
