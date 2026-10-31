/**
 * The part of a doctor's public model that both GET /care/doctors/:id and the public doctor page (GET /entity-graph/related/doctor/:slug)
 * show: the rating, the sub-ratings, the bio, the languages, the large photo, the clinic photos and the education. One place, so the
 * two never drift apart. Only the fields a patient may see: no file id, no private address.
 */

/** A doctor's image as a public address: an http(s) URL as it is, a stored file through GET /care/doctors/:id/media/:mediaId. */
export function publicMediaUrl(doctorId: string, media: string): string {
  return /^https?:\/\//i.test(String(media)) ? media : `/api/v1/care/doctors/${encodeURIComponent(doctorId)}/media/${encodeURIComponent(media)}`;
}

export function publicDoctorProfile(d: any) {
  return {
    rating: d.rating_avg ?? d.rating ?? null,
    reviews_count: d.rating_count ?? d.reviews_count ?? 0,
    // Averages of the published sub-ratings (doctor / clinic / waiting time); null until a patient has given one.
    sub_ratings: { doctor: d.sub_ratings_avg?.doctor ?? null, clinic: d.sub_ratings_avg?.clinic ?? null, waiting: d.sub_ratings_avg?.waiting ?? null },
    bio: d.bio || null,
    languages: Array.isArray(d.languages) ? d.languages : [],
    // 2-web#3 / 2-app#13: the photo and clinic photos as addresses anyone can open (a stored file goes through the public
    // media route of this doctor, which refuses a file still waiting for its scan; an http(s) address is kept as it is)
    photo_url: d.profile_photo ? publicMediaUrl(d.id, d.profile_photo) : null,
    clinicPhotos: (Array.isArray(d.clinic_images) ? d.clinic_images : []).map((m: string) => publicMediaUrl(d.id, m)),
    education: (Array.isArray(d.education) ? d.education : []).map((e: any) => ({ university: e?.university ?? null, graduation_year: e?.graduation_year ?? null, fellowship_board: e?.fellowship_board ?? null })),
  };
}
