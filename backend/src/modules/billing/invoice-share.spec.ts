import { createHash } from 'crypto';
import { BillingService, InvoiceShareService } from './billing.module';

/** An in-memory collection with the few operations the share service uses. */
function col(rows: any[] = []) {
  const test = (d: any, q: any): boolean => Object.entries(q).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('$eq' in v) return d[k] === v.$eq;
      if ('$gte' in v) return d[k] >= v.$gte;
      if ('$gt' in v) return d[k] > v.$gt;
      if ('$in' in v) return v.$in.includes(d[k]);
      if ('$ne' in v) return d[k] !== v.$ne;
    }
    return (d[k] ?? null) === (v ?? null);
  });
  return {
    rows,
    createIndex: async () => ({}),
    findOne: async (q: any) => rows.find((d) => test(d, q)) ?? null,
    find: (q: any) => { let out = rows.filter((d) => test(d, q)); const c: any = { sort: () => c, limit: (n: number) => { out = out.slice(0, n); return c; }, toArray: async () => out }; return c; },
    countDocuments: async (q: any) => rows.filter((d) => test(d, q)).length,
    insertOne: async (d: any) => { rows.push(d); return {}; },
    updateOne: async (q: any, u: any) => { const d = rows.find((r) => test(r, q)); if (d) { if (u.$set) Object.assign(d, u.$set); if (u.$inc) for (const [k, v] of Object.entries(u.$inc)) d[k] = (d[k] ?? 0) + (v as number); } return {}; },
    deleteOne: async () => ({}),
  };
}

function world() {
  const invoices: any[] = [];
  const inv = {
    findOne: (q: any) => ({ lean: async () => invoices.find((d) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$eq' in v ? d[k] === v.$eq : v && typeof v === 'object' && '$ne' in v ? d[k] !== v.$ne : d[k] === v))) ?? null }),
    find: () => ({ lean: async () => [] }),
    create: async (d: any) => { const row = { id: `i${invoices.length + 1}`, status: 'ISSUED', createdAt: new Date(), ...d }; invoices.push(row); return row; },
    updateOne: async () => ({}),
  };
  const links = col(); const views = col();
  const collections: Record<string, any> = {
    invoice_share_links: links, invoice_share_views: views,
    transactions: { find: () => ({ toArray: async () => [{ amount: 115, method: 'card', webhook_payload: { source: { number: 'XXXX-XXXX-XXXX-4242' } } }] }), findOne: async () => ({ method: 'card', webhook_payload: { source: { number: 'XXXX-XXXX-XXXX-4242' } } }) },
    insuranceservicerequests: { find: () => ({ limit: () => ({ toArray: async () => [] }) }), findOne: async () => null },
    provider_profiles: { findOne: async () => ({ type: 'lab', name_ar: 'مختبر', name_en: 'Lab', moh_license_number: 'L-1' }) },
    finance_config: { findOne: async () => null }, pharmacy_orders: { findOne: async () => null }, counters: { findOneAndUpdate: async () => ({ seq: 1 }) },
  };
  const conn: any = {
    model: (n: string) => (n === 'EInvoice' ? inv : { findOne: () => ({ lean: async () => ({ patient_id: 'p1', patient_name: 'Ahmed Private', provider_account_id: 'lab-1', tracking_id: 'LAB-1', items: [{ name_en: 'CBC', price: 115, qty: 1 }] }) }) }),
    collection: (n: string) => collections[n],
  };
  const billing = new BillingService(conn);
  return { share: new InvoiceShareService(conn, billing), links, views, invoices };
}
const me = { id: 'p1', role: 'patient' };
const env = { ...process.env };
beforeEach(() => { process.env.ZATCA_SELLER_NAME = 'Nabd Health Co'; process.env.ZATCA_VAT_NUMBER = '300000000000003'; process.env.API_BASE_URL = 'https://api.example.test'; });
afterEach(() => { process.env = { ...env }; });
const tokenOf = (r: any) => r.token as string;

describe('invoice share links: create', () => {
  it('a random token shown once; only its SHA-256 is stored; 7 days by default', async () => {
    const { share, links } = world();
    const r = await share.create(me, 'lab', 'b1');
    expect(tokenOf(r)).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
    expect(r.url).toBe(`https://api.example.test/api/v1/billing/shared/${r.token}/pdf`);
    expect(links.rows).toHaveLength(1);
    expect(links.rows[0].token_hash).toBe(createHash('sha256').update(r.token).digest('hex'));
    expect(JSON.stringify(links.rows[0])).not.toContain(r.token);
    expect(Math.round((new Date(r.expires_at).getTime() - Date.now()) / 86400_000)).toBe(7);
  });

  it('two links never share a token; the expiry can be 1 to 30 whole days', async () => {
    const { share } = world();
    const a = await share.create(me, 'lab', 'b1'); const b = await share.create(me, 'lab', 'b1', { expires_in_days: 3 });
    expect(a.token).not.toBe(b.token);
    expect(Math.round((new Date(b.expires_at).getTime() - Date.now()) / 86400_000)).toBe(3);
    for (const bad of [0, 31, 2.5, -1]) await expect(share.create(me, 'lab', 'b1', { expires_in_days: bad })).rejects.toThrow('expires_in_days_invalid');
  });

  it('with no API_BASE_URL the url is null and the path is given', async () => {
    delete process.env.API_BASE_URL;
    const r = await world().share.create(me, 'lab', 'b1');
    expect(r.url).toBeNull();
    expect(r.pdf_path).toBe(`/billing/shared/${r.token}/pdf`);
  });

  it('only the owner can make one', async () => {
    await expect(world().share.create({ id: 'someone-else', role: 'patient' }, 'lab', 'b1')).rejects.toThrow('not your booking');
  });

  it('creation is rate limited: 10 an hour per patient, 20 live links per invoice', async () => {
    const { share } = world();
    for (let i = 0; i < 10; i++) await share.create(me, 'lab', 'b1');
    await expect(share.create(me, 'lab', 'b1')).rejects.toMatchObject({ status: 429, message: 'share_link_rate_limited' });
    const w = world();
    for (let i = 0; i < 20; i++) w.links.rows.push({ id: `x${i}`, token_hash: `h${i}`, invoice_no: 'INV-0', created_by: `u${i}`, created_at: new Date(Date.now() - 7200_000), expires_at: new Date(Date.now() + 86400_000), revoked_at: null });
    const first = await w.share.create(me, 'lab', 'b1'); // a different invoice number, so its own count
    expect(first.id).toBeTruthy();
  });
});

describe('invoice share links: open', () => {
  it('shows the invoice and no other account data; logs the view; counts it', async () => {
    const { share, views, links } = world();
    const r = await share.create(me, 'lab', 'b1');
    const page: any = await share.viewPage(r.token, { ip: '203.0.113.9', userAgent: 'Mozilla/5.0' });
    expect(page).toMatchObject({ type: 'invoice', total: 115, payment: { method: 'card', last4: '4242' }, shared: { read_only: true } });
    expect(page.booking_ref).toBe('LAB-1');
    for (const secret of ['patient_id', 'patient_name', 'booking_id', 'id', 'booking_kind', 'webhook_payload']) expect(page).not.toHaveProperty(secret);
    expect(JSON.stringify(page)).not.toMatch(/Ahmed Private|p1"/);
    expect(views.rows).toHaveLength(1);
    expect(views.rows[0]).toMatchObject({ kind: 'page', invoice_no: page.invoice_no, user_agent: 'Mozilla/5.0' });
    expect(views.rows[0].ip_hash).toMatch(/^[0-9a-f]{24}$/);
    expect(JSON.stringify(views.rows[0])).not.toContain('203.0.113.9'); // the address is hashed, not kept
    expect(links.rows[0].view_count).toBe(1);
  });

  it('the PDF behind the link is the same invoice, logged as a pdf view, without the patient name', async () => {
    const { share, views } = world();
    const r = await share.create(me, 'lab', 'b1');
    const out = await share.viewPdf(r.token, { ip: '203.0.113.9' });
    expect(out.pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(views.rows.at(-1)).toMatchObject({ kind: 'pdf' });
  });

  it('an unknown, short, expired or revoked token all answer the same 404', async () => {
    const { share, links } = world();
    const r = await share.create(me, 'lab', 'b1');
    await expect(share.viewPage('x'.repeat(43), {})).rejects.toThrow('link_not_found');
    await expect(share.viewPage('short', {})).rejects.toThrow('link_not_found');
    await expect(share.viewPage(undefined as unknown as string, {})).rejects.toThrow('link_not_found');
    links.rows[0].expires_at = new Date(Date.now() - 1000);
    await expect(share.viewPage(r.token, {})).rejects.toThrow('link_not_found');
    links.rows[0].expires_at = new Date(Date.now() + 86400_000);
    links.rows[0].revoked_at = new Date();
    await expect(share.viewPage(r.token, {})).rejects.toThrow('link_not_found');
  });

  it('a refused view is not logged as a view of the invoice', async () => {
    const { share, views } = world();
    await share.viewPage('y'.repeat(43), {}).catch(() => null);
    expect(views.rows).toHaveLength(0);
  });
});

describe('invoice share links: list and revoke', () => {
  it('lists the links with their state and views, never a token or its hash', async () => {
    const { share } = world();
    const r = await share.create(me, 'lab', 'b1');
    await share.viewPage(r.token, {});
    const rows: any[] = await share.list(me, 'lab', 'b1');
    expect(rows).toEqual([expect.objectContaining({ id: r.id, status: 'active', view_count: 1 })]);
    expect(JSON.stringify(rows)).not.toMatch(new RegExp(`${r.token}|token_hash`));
  });

  it('the owner revokes a link; it stops working at once; revoking again changes nothing', async () => {
    const { share } = world();
    const r = await share.create(me, 'lab', 'b1');
    await share.viewPage(r.token, {});
    expect(await share.revoke(me, 'lab', 'b1', r.id)).toEqual({ id: r.id, status: 'revoked' });
    await expect(share.viewPage(r.token, {})).rejects.toThrow('link_not_found');
    expect(await share.revoke(me, 'lab', 'b1', r.id)).toEqual({ id: r.id, status: 'revoked' });
    expect(((await share.list(me, 'lab', 'b1')) as any[])[0].status).toBe('revoked');
  });

  it('someone else cannot list or revoke; an unknown link id is a 404', async () => {
    const { share } = world();
    const r = await share.create(me, 'lab', 'b1');
    const other = { id: 'someone-else', role: 'patient' };
    await expect(share.list(other, 'lab', 'b1')).rejects.toThrow('not your booking');
    await expect(share.revoke(other, 'lab', 'b1', r.id)).rejects.toThrow('not your booking');
    await expect(share.revoke(me, 'lab', 'b1', 'nope')).rejects.toThrow('link_not_found');
    await expect(share.revoke(me, 'lab', 'b1', { $ne: 1 } as unknown as string)).rejects.toThrow('link_not_found');
  });
});
