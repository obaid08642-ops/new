"""Journey: scoped search suggestions (owner request 2026-10-26: live suggestions on every service screen, each scoped to its service).
  GET /search/suggest?q=<2-3 letters>&section=<pharmacy|consultations|labs|nursing> answers only that section's items, and
  `types=` narrows a section further (scans only: radiology; labs without scans: lab_test,lab_package). No section is the home
  search (everything). Anything else is refused (400). Each probe name is read from the public catalogue of its own section,
  so the journey does not depend on what the other journeys created.
  Stack: backend :8002 (the search index is kept in sync by the change stream; the journey waits for it)."""
import time
import urllib.parse

from lib import Client, journey, step

anon = Client(None, 'anon')

# section -> the types it owns (search-documents.ts SECTION_TYPES)
SECTIONS = {
    'pharmacy': {'medicine'},
    'consultations': {'doctor', 'specialty'},
    'labs': {'lab_test', 'lab_package', 'radiology'},
    'nursing': {'nursing'},
}


def first_name(row):
    for k in ('name_en', 'name_ar', 'name', 'title', 'display_name'):
        v = row.get(k)
        if isinstance(v, str) and len(v.strip()) >= 3:
            return v.strip()
    return None


def probe(path):
    """A prefix (3 letters) of the first named item of a public catalogue."""
    r = anon.get(path)
    rows = r.body if isinstance(r.body, list) else r.items()
    for row in rows:
        n = first_name(row) if isinstance(row, dict) else None
        if n:
            return n[:3], row
    return None, None


def suggest(q, **params):
    qs = urllib.parse.urlencode({'q': q, **params})
    end = time.time() + 25
    while True:
        r = anon.get(f'/search/suggest?{qs}')
        rows = (r.body or {}).get('suggestions') if isinstance(r.body, dict) else None
        if (rows or r.status >= 400) or time.time() > end:
            return r, rows or []
        time.sleep(1.5)   # the index follows the catalogue by the change stream


def run():
    journey('scoped suggestions: each section answers only its own items')
    probes = {
        'pharmacy': probe('/medicines?limit=5'),
        'consultations': probe('/care/specialties'),
        'labs': probe('/labs/services'),
        'nursing': probe('/home-care/services'),
    }
    scans = probe('/radiology/services')
    for section, types in SECTIONS.items():
        q, row = probes[section]
        if not q:
            step(f'{section}: a catalogue item to probe with', False, 'the public catalogue is empty')
            continue
        r, rows = suggest(q, section=section)
        step(f'{section}: "{q}" suggests something', r.ok and rows, r)
        step(f'{section}: every suggestion belongs to the section ({sorted(types)})', rows and all(s.get('type') in types for s in rows), [s.get('type') for s in rows])
        r_all, rows_all = suggest(q)
        step(f'{section}: without a section the same letters answer for the home search (unchanged)', r_all.ok and len(rows_all) >= len(rows), f'{len(rows_all)} vs {len(rows)}')

    journey('scoped suggestions: types narrow labs from scans')
    q_scan, _ = scans
    if q_scan:
        r, rows = suggest(q_scan, section='labs', types='radiology')
        step('scans only: every suggestion is a scan', r.ok and rows and all(s.get('type') == 'radiology' for s in rows), [s.get('type') for s in rows])
        r, rows = suggest(q_scan, section='labs', types='lab_test,lab_package')
        step('labs without scans: no scan is suggested', r.ok and all(s.get('type') != 'radiology' for s in rows), [s.get('type') for s in rows])
    else:
        step('a scan to probe with', False, 'the radiology catalogue is empty')
    q_med = probes['pharmacy'][0]
    if q_med:
        r, rows = suggest(q_med, section='pharmacy', types='radiology')
        step('a type outside the section suggests nothing (not everything)', r.ok and rows == [], rows)

    journey('scoped suggestions: bad input is refused')
    for params in ({'section': 'insurance'}, {'types': 'medicine,evil'}, {'section': 'bogus'}):
        r = anon.get('/search/suggest?' + urllib.parse.urlencode({'q': 'abc', **params}))
        step(f'{params} is refused with 400', r.status == 400, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
