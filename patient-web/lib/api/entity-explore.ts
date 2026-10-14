/** What `GET /entity-graph/explore` answers (the fields the backend projects) and what the public directory pages read from it. */
export type ExploreDoctor = {
  id: string;
  slug?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  specialty?: string | null;
  city?: string | null;
};

export type ExploreFacility = {
  id: string;
  slug?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  type?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  accepted_insurance?: string[] | null;
};

export type ExploreResult = {
  total_doctors?: number;
  total_facilities?: number;
  doctors?: ExploreDoctor[];
  facilities?: ExploreFacility[];
};

/** A URL segment as text: decoded when it is still encoded, as it is when it cannot be decoded. */
export function readSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
