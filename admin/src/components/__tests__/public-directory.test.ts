import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDirectory } from '../PublicDirectory';

// Needs-review #980/#982/#984/#986/#989/#991: getServerSideProps runs in Node, where fetch
// rejects a relative URL, so the directory pages always rendered empty.
describe('fetchDirectory (server side)', () => {
  const original = process.env.ADMIN_BACKEND_URL;
  afterEach(() => { process.env.ADMIN_BACKEND_URL = original; vi.unstubAllGlobals(); });

  it('calls the backend with an absolute /api/v1 URL and returns the list', async () => {
    process.env.ADMIN_BACKEND_URL = 'http://backend.test/';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'm1' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchDirectory('/medicines')).resolves.toEqual([{ id: 'm1' }]);
    expect(fetchMock).toHaveBeenCalledWith('http://backend.test/api/v1/medicines', expect.anything());
  });

  it('returns an empty list without a backend URL instead of fetching a relative path', async () => {
    delete process.env.ADMIN_BACKEND_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchDirectory('/medicines')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
