"""Concrete URLs for dynamic routes, harvested from links the apps themselves rendered during the crawls.

  python3 tools/audit/harvest_dynamic.py website|patient-app > /tmp/urls_<app>.json

A dynamic route (e.g. /[locale]/appointments/[appointmentId]) is matched against every NAVIGATE target and every
<a href> seen in the crawl evidence, so the id is one a real user path produced (owned by the signed-in account).
Prints [pattern, url] pairs; patterns with no harvested URL are listed on stderr for DB lookup or BLOCKED.
"""
import glob, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EV = os.path.join(ROOT, 'docs/review/evidence')
APP = sys.argv[1]


def pattern_re(route):
    r = re.escape(route)
    r = re.sub(r'\\\[\\\[\\\.\\\.\\\.[^\]]+\\\]\\\]', r'(?:/.*)?', r).replace('/(?:/.*)?', '(?:/.*)?')
    r = re.sub(r'\\\[[^\]\\]+\\\]', r'[^/?#]+', r)
    return re.compile('^' + r + r'/?(?:[?#].*)?$')


def main():
    inv = json.load(open(os.path.join(ROOT, 'docs/review/inventory/screens.json')))
    if APP == 'website':
        dyn = [p['route'] for p in inv['patient-web']['pages'] if p['dynamic']]
        dyn = [d.replace('/[locale]', '/ar', 1) for d in dyn]
        files = glob.glob(os.path.join(EV, 'web_crawl_*.json'))
        urls = set()
        for f in files:
            for p in json.load(open(f)).get('pages', []):
                for e in p.get('elements', []):
                    if e.get('result') == 'NAVIGATE' and e.get('to'):
                        urls.add(e['to'])
                for h in p.get('links', []):
                    urls.add(h)
        if os.path.exists('/tmp/web_links.json'):      # every <a href> seen on the static pages (link harvest pass)
            urls |= set(json.load(open('/tmp/web_links.json')))
        static = {p['route'].replace('/[locale]', '/ar', 1) for p in inv['patient-web']['pages'] if not p['dynamic']}
    else:
        dyn = [r['route'] for r in inv['patient-app'] if r['dynamic']]
        files = glob.glob(os.path.join(EV, 'rn_web_patient-app_*.json'))
        urls = set()
        for f in files:
            d = json.load(open(f))
            for r in (d.get('routes') if isinstance(d, dict) else d):
                for e in r.get('elements', []) or []:
                    if e.get('result') == 'NAVIGATE' and e.get('to'):
                        urls.add(e['to'])
        static = {r['route'] for r in inv['patient-app'] if not r['dynamic']}
    urls = {u for u in urls if u.split('?')[0].rstrip('/') not in static}   # a static route is not an instance of a dynamic one
    out, missing = [], []
    for d in dyn:
        rx = pattern_re(d)
        hit = sorted(u for u in urls if rx.match(u.split('#')[0]))
        pat = d.replace('/ar', '/[locale]', 1) if APP == 'website' else d
        if hit:
            out.append([pat, hit[0]])
        else:
            missing.append(pat)
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
    print(f'\nharvested {len(out)}/{len(dyn)}; missing: {missing}', file=sys.stderr)


if __name__ == '__main__':
    main()
