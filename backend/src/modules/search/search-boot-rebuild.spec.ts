import { SearchService } from './search.service';

/** 2026-11-16 (mongod OOM loop): a search rebuild streams every searchable document. One that was killed before it finished must not be started again at the next boot at once. */
function service(meta: any, count: number) {
  const svc: any = Object.create(SearchService.prototype);
  svc.log = { log: jest.fn(), warn: jest.fn() };
  svc.meili = null;
  const updates: any[] = [];
  const metaCol = { findOne: jest.fn().mockResolvedValue(meta), updateOne: jest.fn(async (_q: any, u: any) => { updates.push(u); }) };
  svc.conn = { collection: () => metaCol };
  Object.defineProperty(svc, 'index', { value: { estimatedDocumentCount: jest.fn().mockResolvedValue(count) } });
  svc.rebuild = jest.fn().mockResolvedValue({ indexed: 1 });
  return { svc, updates };
}
const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });

describe('bootRebuild', () => {
  it('rebuilds when the index is missing or of an older version and no rebuild started recently', async () => {
    const a = service({ version: 1 }, 100); await a.svc['bootRebuild'](); expect(a.svc.rebuild).toHaveBeenCalledTimes(1);
    const b = service(null, 0); await b.svc['bootRebuild'](); expect(b.svc.rebuild).toHaveBeenCalledTimes(1);
  });

  it('does NOT start another rebuild when one started 5 minutes ago and never finished (a restart loop)', async () => {
    const started = new Date(Date.now() - 5 * 60_000);
    const { svc } = service({ version: 1, rebuild_started_at: started }, 100);
    await svc['bootRebuild']();
    expect(svc.rebuild).not.toHaveBeenCalled();
    expect(svc.log.warn).toHaveBeenCalledWith(expect.stringContaining('did not finish'));
  });

  it('tries again once the wait has passed (default 30 minutes; SEARCH_REBUILD_RETRY_MIN changes it)', async () => {
    const old = service({ version: 1, rebuild_started_at: new Date(Date.now() - 31 * 60_000) }, 100);
    await old.svc['bootRebuild'](); expect(old.svc.rebuild).toHaveBeenCalledTimes(1);
    process.env.SEARCH_REBUILD_RETRY_MIN = '0';
    const zero = service({ version: 1, rebuild_started_at: new Date() }, 100);
    await zero.svc['bootRebuild'](); expect(zero.svc.rebuild).toHaveBeenCalledTimes(1);
  });

  it('a current index with documents is not rebuilt', async () => {
    const { svc } = service({ version: 3 }, 100);
    await svc['bootRebuild']();
    expect(svc.rebuild).not.toHaveBeenCalled();
  });
});
