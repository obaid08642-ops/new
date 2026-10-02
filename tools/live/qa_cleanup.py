"""Remove the test data a QA window created in the QA database (dry run unless --apply).

  python3 tools/live/qa_cleanup.py --since 2026-10-02T15:23:19Z            # dry run: counts + manifest
  python3 tools/live/qa_cleanup.py --since 2026-10-02T15:23:19Z --apply    # deletes exactly what the dry run listed

Scope, all of it created on or after --since in DB_NAME (default nabd_form2, the QA database, never production):
  1. users with a test address (@nabd.test) or no address (guest sessions) and everything that references their ids
     (user_id / patient_id / patient_account_id / provider_account_id / doctor_id / owner_id / created_by ...);
  2. every other document with createdAt/created_at >= --since (journeys, crawlers, logs, outbox, notifications).
Reference data that existed before --since is never touched. The manifest (ids per collection) is written to
docs/review/evidence/qa_cleanup_<ts>.json before anything is deleted, so the run is auditable.
"""
import argparse, datetime, json, os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DB = os.environ.get('DB_NAME', 'nabd_form2')
assert DB != 'nabd_nestjs' and 'prod' not in DB, 'refusing to run outside the QA database'
REF_FIELDS = ['user_id', 'patient_id', 'patient_account_id', 'provider_account_id', 'account_id', 'doctor_id',
              'owner_id', 'created_by', 'actor_id', 'pharmacy_account_id', 'booked_by_user_id', 'recipient_id']


def mongo(js):
    r = subprocess.run(['docker', 'exec', 'p5mongo', 'mongosh', '--quiet', DB, '--eval', js], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-800:])
    return r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--since', required=True)
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    js = f"""
    const t0 = ISODate({json.dumps(a.since)});
    const users = db.users.find({{createdAt: {{$gte: t0}}, $or: [{{email: /@nabd\\.test$/}}, {{email: {{$exists: false}}}}, {{email: null}}]}}, {{_id: 0, id: 1}}).toArray().map(u => u.id).filter(Boolean);
    const refs = {json.dumps(REF_FIELDS)};
    const out = {{users: users.length, collections: {{}}}};
    for (const c of db.getCollectionNames()) {{
      if (c.startsWith('system.')) continue;
      const q = {{$or: [{{createdAt: {{$gte: t0}}}}, {{created_at: {{$gte: t0}}}}].concat(refs.map(f => ({{[f]: {{$in: users}}}})))}};
      if (c === 'users') q.$or.push({{id: {{$in: users}}}});
      const ids = db[c].find(q, {{_id: 1}}).toArray().map(d => d._id);
      if (ids.length) out.collections[c] = {{count: ids.length, ids: ids.map(String)}};
      if ({'true' if a.apply else 'false'} && ids.length) db[c].deleteMany({{_id: {{$in: ids}}}});
    }}
    print(JSON.stringify(out));
    """
    res = json.loads(mongo(js).strip().splitlines()[-1])
    ts = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%S')
    path = os.path.join(ROOT, 'docs/review/evidence', f"qa_cleanup_{'applied' if a.apply else 'dryrun'}_{ts}.json")
    json.dump({'db': DB, 'since': a.since, 'applied': a.apply, **res}, open(path, 'w'), indent=1)
    total = sum(v['count'] for v in res['collections'].values())
    print(f"{'DELETED' if a.apply else 'would delete'} {total} documents in {len(res['collections'])} collections "
          f"({res['users']} test users); manifest {os.path.relpath(path, ROOT)}")
    for c, v in sorted(res['collections'].items(), key=lambda x: -x[1]['count'])[:15]:
        print(f'  {v["count"]:6d}  {c}')


if __name__ == '__main__':
    main()
