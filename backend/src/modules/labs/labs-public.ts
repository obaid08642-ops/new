/**
 * The approved, public lab behind GET /labs/:id. The id is the lab's account id (what a booking carries) or its profile id (what
 * the public map and GET /providers/:id list): the map's "Book" opened /diagnostics/labs/<profile id> and every lab answered 404.
 */
export function publicLabFilter(id: string) {
  return {
    $or: [{ account_id: { $eq: id } }, { id: { $eq: id } }],
    type: { $in: ['lab', 'hospital'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved',
  };
}
