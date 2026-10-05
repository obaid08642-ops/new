/**
 * 15.6 — Bad or empty data (server side): malformed pagination input must
 * never become a 500 or NaN page metadata.
 *
 * `GET /medicines` parses ?page=/ ?limit= with bare parseInt, so garbage
 * yields NaN, and paginate()/cursorPage() used to propagate NaN straight
 * into skip()/limit() and back out as {page: NaN, total_pages: NaN}.
 * Both layers now coerce (controller `|| default`, service Number.isFinite
 * guard) following the codebase's dominant `parseInt(x) || default` idiom.
 *
 * Reverting either guard makes the NaN tests red (NaN metadata / NaN driver
 * args). The live Schemathesis fuzz run needs a running server (no docker
 * here) — see backend/scripts/schemathesis_fuzz.sh; it was not executed.
 */
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';

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
        // cursorPage shape: find().sort().limit()
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
    // Garbage cursor must not inject a cursor predicate…
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

describe('15.6 medicines controller coerces garbage ?page= ?limit=', () => {
  const ctrlWith = () => {
    const svc: any = { paginate: jest.fn(async () => ({})), cursorPage: jest.fn(async () => ({})), list: jest.fn(async () => []) };
    return { ctrl: new MedicinesController(svc), svc };
  };

  it("?cursor=x&limit=abc → cursorPage receives limit 30", async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).list(undefined, undefined, undefined, undefined, undefined, undefined, 'abc', 'x', undefined);
    expect(svc.cursorPage).toHaveBeenCalled();
    expect(svc.cursorPage.mock.calls[0][3]).toBe(30);
  });

  it("?page=abc&limit=abc → paginate receives page 1, limit 30", async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).list(undefined, undefined, undefined, undefined, undefined, 'abc', 'abc', undefined, undefined);
    expect(svc.paginate).toHaveBeenCalled();
    expect(svc.paginate.mock.calls[0][2]).toBe(1);
    expect(svc.paginate.mock.calls[0][3]).toBe(30);
  });
});

describe('F3 every remaining medicines controller path coerces ?page=abc / ?limit=abc', () => {
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
  const finite = (v: any) => expect(Number.isFinite(v)).toBe(true);

  it('trending/recent ?limit=abc → finite default 10', async () => {
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
    finite(svc.trendingSearches.mock.calls[0][0]);
  });
});
