import { PatientReviewsListController } from './ratings-compat.controller';

// OC-C C-19 (779): the reviews list carries a privacy-safe reviewer label and target label.
function controllerFor() {
  const conn: any = {
    db: {
      collection: jest.fn((name: string) => {
        if (name === 'reviews') {
          return {
            find: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                      { id: 'rev-1', rating: 5, comment: 'ممتاز', patient_id: 'pat-9', provider_id: 'prof-3', booking_kind: 'lab', created_at: new Date() },
                    ]),
                  }),
                }),
              }),
            }),
          };
        }
        if (name === 'users') {
          return { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ id: 'pat-9', full_name: 'سارة أحمد' }]) }) };
        }
        if (name === 'provider_profiles') {
          return { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ id: 'prof-3', name_ar: 'مختبر البرج' }]) }) };
        }
        return { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) };
      }),
    },
  };
  return new PatientReviewsListController(conn);
}

describe('OC C-19 reviews list enrichment', () => {
  it('adds reviewer and target labels without private fields', async () => {
    const out: any = await controllerFor().list({ id: 'pat-1' });
    const row = out?.data?.[0];
    expect(row?.rating).toBe(5);
    expect(typeof row?.reviewer_label).toBe('string');
    expect(typeof row?.target_label).toBe('string');
    const s = JSON.stringify(row);
    expect(s).not.toContain('pat-9');
    expect(s).not.toContain('+966');
  });
});
