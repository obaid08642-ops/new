import { publicLabFilter } from './labs-public';

// Walkthrough of the website (issue 1550): the public map lists a lab by its profile id and links "Book" to /diagnostics/labs/<id>;
// GET /labs/:id looked the lab up by account id only, so the page was a 404 for every lab.
describe('publicLabFilter', () => {
  it('finds the lab by its account id or its profile id, only when it is public and approved', () => {
    const f = publicLabFilter('abc');
    expect(f.$or).toEqual([{ account_id: { $eq: 'abc' } }, { id: { $eq: 'abc' } }]);
    expect(f).toEqual(expect.objectContaining({ status: 'active', public_eligibility: true, medical_review_status: 'approved' }));
    expect(f.type).toEqual({ $in: ['lab', 'hospital'] });
  });

  it('takes the id literally (an operator object is never read as a query)', () => {
    const f = publicLabFilter('x');
    expect(JSON.stringify(f.$or)).not.toContain('$ne');
  });
});
