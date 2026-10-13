import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';
import { clampPageInt, queryInt, queryNumber } from '../../common/safe-query';

/**
 * 15.6 — Bad or empty data (server side).
 *
 * `GET /medicines` parsed ?page= / ?limit= with a bare parseInt, so
 * `?limit=abc` became NaN; `Math.max(NaN, 1)` stays NaN and `limit(NaN)`
 * reaches the driver as a 500-class failure, and the page metadata comes back
 * `{page: NaN, total_pages: NaN}`. The phase-15 contract is that the backend
 * never answers 5xx for bad input, so the controller coerces at the edge and
 * the service still clamps into range.
 *
 * Reverting either guard makes these assertions red.
 */

const ROWS = [
  { id: 'm-1', name_ar: 'بنادول', price: 10, availability_status: 'none' },
  { id: 'm-2', name_ar: 'فيفادول', price: 12, availability_status: 'none' },
];

function mockModel(captured: { skip?: any; limit?: any; query?: any }) {
  return {
    find: jest.fn((q: any) => {
      captured.query = q;
      const sortChain: any = {
        sort: jest.fn(() => sortChain),
        skip: jest.fn((n: any) => {
          captured.skip = n;
          return { limit: jest.fn(async (m: any) => { captured.limit = m; return ROWS; }) };
        }),
        limit: jest.fn(async (m: any) => { captured.limit = m; return ROWS; }),
      };
      return sortChain;
    }),
    countDocuments: jest.fn(async () => 2),
  };
}

const mockRedis = () => ({ getJson: jest.fn(async () => null), setJson: jest.fn(async () => undefined) });

const svcWith = (captured: { skip?: any; limit?: any; query?: any }) =>
  new MedicinesService(
    mockModel(captured) as any,
    { emit: jest.fn() } as any,
    mockRedis() as any,
    {} as any,
    {} as any,
  );

describe('15.6 the query coercion helpers', () => {
  it('queryInt falls back to the default for NaN, empty and non-numeric input', () => {
    expect(queryInt(undefined, 30)).toBe(30);
    expect(queryInt('abc', 30)).toBe(30);
    expect(queryInt('', 30)).toBe(30);
    expect(queryInt('   ', 30)).toBe(30);
    expect(queryInt('12abc', 30)).toBe(12);
    expect(queryInt('7', 30)).toBe(7);
    expect(queryInt('-3', 30)).toBe(-3);
  });

  it('queryNumber drops a non-finite coordinate instead of returning NaN', () => {
    expect(queryNumber('abc')).toBeUndefined();
    expect(queryNumber('91.5')).toBe(91.5);
    expect(queryNumber(undefined)).toBeUndefined();
  });

  it('clampPageInt refuses NaN and clamps into range', () => {
    expect(clampPageInt(NaN, 1)).toBe(1);
    expect(clampPageInt('abc', 30, 100)).toBe(30);
    expect(clampPageInt(-5, 1)).toBe(1);
    expect(clampPageInt(99999, 30, 100)).toBe(100);
    expect(clampPageInt(3.9, 1)).toBe(3);
  });
});

describe('15.6 medicines pagination never 500s on malformed input (mocked model)', () => {
  it('paginate(NaN, NaN) coerces to page 1 / limit 30 with finite metadata', async () => {
    const captured: any = {};
    const out = await svcWith(captured).paginate('', undefined, NaN, NaN);
    expect(out.page).toBe(1);
    expect(out.limit).toBe(30);
    expect(Number.isFinite(out.total_pages)).toBe(true);
    expect(Array.isArray(out.data)).toBe(true);
    expect(Number.isFinite(captured.skip)).toBe(true);
    expect(Number.isFinite(captured.limit)).toBe(true);
  });

  it('paginate clamps negative/huge values (page -5 → 1, limit 99999 → 100)', async () => {
    const captured: any = {};
    const out = await svcWith(captured).paginate('', undefined, -5, 99999);
    expect(out.page).toBe(1);
    expect(out.limit).toBe(100);
  });

  it('cursorPage with garbage cursor + NaN limit degrades to the first page', async () => {
    const captured: any = {};
    const out = await svcWith(captured).cursorPage('', undefined, '!!!not-a-cursor!!!', NaN);
    expect(out.limit).toBe(30);
    expect(typeof out.has_more).toBe('boolean');
    expect(out.next_cursor === null || typeof out.next_cursor === 'string').toBe(true);
    expect(Number.isFinite(captured.limit)).toBe(true);
    expect(captured.query?.$or).toBeUndefined();
  });

  it('cursorPage with a valid cursor still applies the cursor predicate', async () => {
    const captured: any = {};
    const valid = Buffer.from(JSON.stringify({ n: 'بنادول', i: 'm-1' }), 'utf8').toString('base64url');
    await svcWith(captured).cursorPage('', undefined, valid, 30);
    expect(captured.query?.$or).toHaveLength(2);
  });

  it('list(NaN) falls back to the default cap without throwing', async () => {
    const captured: any = {};
    const out = await svcWith(captured).list('', undefined, true, NaN);
    expect(Array.isArray(out)).toBe(true);
  });
});

describe('15.6 the medicines controller coerces garbage ?page= / ?limit=', () => {
  const ctrlWith = () => {
    const svc: any = { paginate: jest.fn(async () => ({})), cursorPage: jest.fn(async () => ({})), list: jest.fn(async () => []) };
    return { ctrl: new MedicinesController(svc), svc };
  };

  it('?cursor=x&limit=abc → cursorPage receives limit 30', async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).list(undefined, undefined, undefined, undefined, undefined, undefined, 'abc', 'x', undefined);
    expect(svc.cursorPage).toHaveBeenCalled();
    expect(svc.cursorPage.mock.calls[0][3]).toBe(30);
  });

  it('?page=abc&limit=abc → paginate receives page 1, limit 30', async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).list(undefined, undefined, undefined, undefined, undefined, 'abc', 'abc', undefined, undefined);
    expect(svc.paginate).toHaveBeenCalled();
    expect(svc.paginate.mock.calls[0][2]).toBe(1);
    expect(svc.paginate.mock.calls[0][3]).toBe(30);
  });

  it('an absent ?limit= leaves the service default in charge', async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).list(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    expect(svc.list.mock.calls[0][3]).toBeUndefined();
  });

  it('a garbage ?limit= without a cursor falls back to the route default, never NaN', async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).list(undefined, undefined, undefined, undefined, undefined, undefined, 'abc', undefined, undefined);
    expect(Number.isFinite(svc.list.mock.calls[0][3])).toBe(true);
    expect(svc.list.mock.calls[0][3]).toBe(30);
  });
});

describe('15.6 every remaining medicines controller path coerces ?page=abc / ?limit=abc', () => {
  const ctrlWithAll = () => {
    const svc: any = {
      trendingSearches: jest.fn(async () => []),
      recentSearches: jest.fn(async () => []),
      listShortageReports: jest.fn(async () => ({})),
      listImageSuggestions: jest.fn(async () => ({})),
      listChangeRequests: jest.fn(async () => ({})),
      adminListCatalog: jest.fn(async () => ({})),
      getPriceHistory: jest.fn(async () => ({})),
      recentlyViewed: jest.fn(async () => []),
    };
    return { ctrl: new MedicinesController(svc), svc };
  };

  it('trending/recent ?limit=abc → default 10', async () => {
    const { ctrl, svc } = ctrlWithAll();
    await (ctrl as any).trending('abc');
    expect(svc.trendingSearches.mock.calls[0][0]).toBe(10);
    await (ctrl as any).recent({ id: 'u-1' }, 'abc');
    expect(svc.recentSearches.mock.calls[0][1]).toBe(10);
  });

  it('shortage/image/change-request ?page=abc&limit=abc → 1 / 20', async () => {
    const { ctrl, svc } = ctrlWithAll();
    await (ctrl as any).shortageReports('pending', 'abc', 'abc');
    expect(svc.listShortageReports.mock.calls[0].slice(1)).toEqual([1, 20]);
    await (ctrl as any).imageSuggestions('pending', 'abc', 'abc');
    expect(svc.listImageSuggestions.mock.calls[0].slice(1)).toEqual([1, 20]);
    await (ctrl as any).changeRequests('pending', undefined, 'abc', 'abc');
    expect(svc.listChangeRequests.mock.calls[0].slice(2)).toEqual([1, 20]);
  });

  it('adminCatalog ?page=abc&limit=abc → 1 / 25; priceHistory → 1 / 50; recentlyViewed → 20', async () => {
    const { ctrl, svc } = ctrlWithAll();
    await (ctrl as any).adminCatalog(undefined, undefined, 'abc', 'abc', undefined);
    expect(svc.adminListCatalog.mock.calls[0][0]).toMatchObject({ page: 1, limit: 25 });
    await (ctrl as any).priceHistory('m-1', 'abc', 'abc');
    expect(svc.getPriceHistory.mock.calls[0].slice(1)).toEqual([1, 50]);
    await (ctrl as any).recentlyViewed({ id: 'u-1' }, 'abc');
    expect(svc.recentlyViewed.mock.calls[0][1]).toBe(20);
  });

  it('valid numbers still pass through untouched', async () => {
    const { ctrl, svc } = ctrlWithAll();
    await (ctrl as any).trending('7');
    expect(svc.trendingSearches.mock.calls[0][0]).toBe(7);
    await (ctrl as any).shortageReports('pending', '3', '15');
    expect(svc.listShortageReports.mock.calls[0].slice(1)).toEqual([3, 15]);
  });
});