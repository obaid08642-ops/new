import { readFileSync } from 'node:fs';

import { catalogPath, DIAG_MAX_LIMIT, hasMorePages, parseCatalogPage, serverCategoryOf, sortOfFilter } from '../../utils/diagCatalogApi';
import { catalogArt, itemRating } from '../../utils/diagCatalog';
import { normalizeLabList } from '../../utils/labMappers';
import { RAD_FILTERS } from '../../utils/diagFilters';
import { artOfBackendCategory } from '../../../../packages/ui/icons/diag-art';

jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));

/** Wire-up of the paged catalogue (backend #2041): parameters, both response shapes, category -> illustration, the rating. TEST values. */
describe('parameters the backend takes', () => {
  it('builds page + limit first, then category, search, home_visit and the sort flag', () => {
    expect(catalogPath('radiology', { page: 2, category: 'mri', search: ' knee ', sort: 'highest_rated', homeVisit: true })).toBe(
      '/radiology/services?page=2&limit=20&category=mri&search=knee&home_visit=true&highest_rated=true',
    );
    expect(catalogPath('lab', { page: 1, limit: 6 })).toBe('/labs/services?page=1&limit=6');
    expect(catalogPath('lab', { page: 3, sort: 'lowest_price' })).toBe('/labs/services?page=3&limit=20&lowest_price=true');
  });
  it('caps the limit at the server maximum, encodes the search and drops bad values', () => {
    expect(catalogPath('lab', { page: 1, limit: 5000 })).toBe(`/labs/services?page=1&limit=${DIAG_MAX_LIMIT}`);
    expect(catalogPath('lab', { page: 1, search: 'خ & ز' })).toBe(`/labs/services?page=1&limit=20&search=${encodeURIComponent('خ & ز')}`);
    expect(catalogPath('lab', { page: 0 })).toContain('page=1&');
    expect(catalogPath('lab', { page: 1, category: 'a&b=c' })).not.toContain('category');
  });
  it('maps the sheet option to the backend flag and the scan chip to the category', () => {
    expect(sortOfFilter('highest_rated')).toBe('highest_rated');
    expect(sortOfFilter('lowest_price')).toBe('lowest_price');
    expect(sortOfFilter('home_visit')).toBeUndefined();
    expect(serverCategoryOf('radiology', 'ct')).toBe('ct');
    expect(serverCategoryOf('radiology', 'all')).toBeUndefined();
    expect(serverCategoryOf('lab', 'hormones')).toBeUndefined(); // test chips stay a client filter
  });
  it('offers highest rated on the scans too', () => {
    expect(RAD_FILTERS.map((f) => f.id)).toContain('highest_rated');
  });
});

describe('both response shapes', () => {
  const rows = [{ id: 'a' }, { id: 'b' }];
  it('reads the plain array and the paged envelope', () => {
    expect(parseCatalogPage(rows)).toEqual({ rows, total: 2, page: null, totalPages: null });
    const page = parseCatalogPage({ data: rows, total: 45, page: 1, limit: 20, total_pages: 3 });
    expect(page).toEqual({ rows, total: 45, page: 1, totalPages: 3 });
    expect(hasMorePages(page, 1)).toBe(true);
    expect(hasMorePages({ ...page, page: 3 }, 3)).toBe(false);
  });
  it('anything else is an empty page; a full page without totals may have more', () => {
    expect(parseCatalogPage(null).rows).toEqual([]);
    expect(parseCatalogPage({ message: 'x' }).rows).toEqual([]);
    expect(hasMorePages({ rows: new Array(20).fill(0), page: null, totalPages: null }, 1)).toBe(true);
    expect(hasMorePages({ rows: [1], page: null, totalPages: null }, 1)).toBe(false);
  });
  it('the mapper reads the rows of either shape', () => {
    const scan = { id: 's1', name_en: 'Knee MRI', modality: 'mri', category: 'mri' };
    expect(normalizeLabList({ data: [scan], total: 1, page: 1, limit: 20, total_pages: 1 }).map((x) => x.id)).toEqual(['s1']);
    expect(normalizeLabList([scan]).map((x) => x.id)).toEqual(['s1']);
  });
});

describe('the backend category decides the illustration first', () => {
  const [mri, rated] = normalizeLabList([
    { id: 's1', name_en: 'Ultrasound looking name', modality: 'ct', category: 'mri' },
    { id: 's2', name_en: 'Panel', category: 'diabetes', rating: 4.25, rating_count: 8 },
  ]);
  it('wins over the modality text and the names', () => {
    expect(catalogArt('radiology', mri)).toBe('mri');
    expect(catalogArt('lab', rated)).toBe('sugar');
  });
  it('an unknown category falls to the name / modality words, and the other kind never leaks', () => {
    const [dexa] = normalizeLabList([{ id: 's3', name_en: 'Bone density DEXA', modality: 'dexa', category: 'dexa' }]);
    expect(catalogArt('radiology', dexa)).toBe('xray');
    expect(artOfBackendCategory('lab', 'mri')).toBeNull();
    expect(artOfBackendCategory('radiology', 'blood')).toBeNull();
  });
});

describe('rating on the card', () => {
  it('is returned only for a rating above 0 with a count above 0', () => {
    const [yes, unrated, zero] = normalizeLabList([
      { id: 'a', name_en: 'A', rating: 4.5, rating_count: 12 },
      { id: 'b', name_en: 'B', rating: null, rating_count: 0 },
      { id: 'c', name_en: 'C', rating: 0, rating_count: 3 },
    ]);
    expect(itemRating(yes)).toEqual({ rating: 4.5, count: 12 });
    expect(itemRating(unrated)).toBeNull();
    expect(itemRating(zero)).toBeNull();
  });
  it('has the line in the six languages', () => {
    for (const loc of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
      const m = JSON.parse(readFileSync(`src/i18n/locales/${loc}.json`, 'utf8')) as Record<string, string>;
      expect(m['diag.ratingLine']).toContain('{n}');
      expect(m['diag.ratingLine']).toContain('{count}');
      if (loc !== 'en') expect(m['diag.ratingLine']).not.toBe('Rating {n} ({count})');
    }
  });
});
