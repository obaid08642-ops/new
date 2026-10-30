// How many MongoDB operations does one request cost? Turns the profiler on for a throwaway test database, sends N requests per route,
// and prints operations per request, documents examined/returned and time, grouped by collection. Local or staging test stacks only.
//   DB_NAME=nabd_perf node tools/perf/query-count.js [N=20] [route,...]   (backend on :8002 against the same Mongo)
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../../backend/node_modules/mongoose'));
const URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';
const DB = process.env.DB_NAME || 'nabd_perf';
const BASE = process.env.BASE || 'http://127.0.0.1:8002/api/v1';
if (!/perf|live|test/.test(DB) || !/127\.0\.0\.1|localhost/.test(URL + BASE)) { console.error('refused: test stack only'); process.exit(2); }
const N = Number(process.argv[2] || 20);
const ROUTES = {
  catalogue: '/public/products/search?locale=ar&limit=20',
  product_search: '/public/products/search?q=panadol&locale=en&limit=20',
  site_search: '/search?q=panadol&locale=en&limit=10',
  autocomplete: '/medicines/autocomplete?q=pan',
  category_items: '/public/categories/ar/items?limit=20',
  medicines_list: '/public/medicines?limit=30&page=2',
  labs_list: '/labs/services',
  radiology_list: '/radiology/services',
  nursing_list: '/home-care/services',
  doctors: '/care/doctors?limit=20',
};
const only = process.argv[3] ? process.argv[3].split(',') : Object.keys(ROUTES);
(async () => {
  const c = await mongoose.createConnection(URL, { dbName: DB }).asPromise();
  const db = c.db;
  const out = [];
  for (const name of only) {
    await db.command({ profile: 0 }); await db.collection('system.profile').drop().catch(() => undefined);
    await fetch(BASE + ROUTES[name]);                       // warm the caches the request fills, so the count is the steady state
    await db.command({ profile: 2 });
    for (let i = 0; i < N; i++) await fetch(BASE + ROUTES[name] + (ROUTES[name].includes('?') ? '&' : '?') + `_n=${i}`);
    await db.command({ profile: 0 });
    const ops = await db.collection('system.profile').find({ ns: { $not: /system\.profile|\.\$cmd|admin\./ }, op: { $in: ['query', 'command', 'update', 'insert', 'remove', 'getmore'] } }).toArray();
    const by = {};
    for (const o of ops) {
      const k = `${o.ns.split('.').slice(1).join('.')} ${o.op}${o.command && o.command.aggregate ? ' aggregate' : ''}${o.command && o.command.count ? ' count' : ''}`;
      const e = (by[k] ||= { n: 0, ms: 0, examined: 0, returned: 0 });
      e.n++; e.ms += o.millis || 0; e.examined += o.docsExamined || 0; e.returned += o.nreturned || 0;
    }
    out.push({ route: name, per_request_ops: +(ops.length / N).toFixed(1), detail: Object.entries(by).map(([k, e]) => ({ op: k, per_request: +(e.n / N).toFixed(1), ms_each: +(e.ms / e.n).toFixed(1), examined_each: Math.round(e.examined / e.n), returned_each: Math.round(e.returned / e.n) })) });
  }
  console.log(JSON.stringify(out, null, 1));
  await c.close();
})();
