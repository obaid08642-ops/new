#!/usr/bin/env python3
"""17.8: axe-core on the main public pages, in a real browser, against the running site (the live gate serves it on :3100).

It loads each page the way a signed-out visitor sees it, runs axe with the WCAG 2.0/2.1 A and AA rules, and fails when a page
has a serious or critical violation. Minor and moderate findings are printed but do not fail the run: they are the backlog.

  A11Y_BASE=http://127.0.0.1:3100 AXE_JS=/path/to/axe.min.js python3 tools/a11y/axe-pages.py

axe-core is not vendored: the workflow installs a pinned version (axe-core@4.10.3) and points AXE_JS at it.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("A11Y_BASE", "http://127.0.0.1:3100").rstrip("/")
AXE_JS = os.environ.get("AXE_JS", "/tmp/axe/node_modules/axe-core/axe.min.js")
LOCALE = os.environ.get("A11Y_LOCALE", "en")
BLOCKING = {"serious", "critical"}
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]

# Twenty main public pages (signed-out). The paths are the site's own routes; the home page is the locale root.
PAGES = [
    "", "articles", "medicine-catalog", "consultations/doctors", "diagnostics", "search", "login", "register",
    "cart", "privacy", "terms", "support", "emergency", "mental-health", "nutrition", "map", "home-care",
    "nursing", "pharmacies", "offers",
]


def main() -> int:
    with open(AXE_JS, encoding="utf-8") as handle:
        axe_source = handle.read()
    failures: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None)
        # bypass_csp: axe is injected as a script tag, which the site's nonce policy would otherwise refuse.
        context = browser.new_context(viewport={"width": 390, "height": 844}, bypass_csp=True)
        page = context.new_page()
        for path in PAGES:
            url = f"{BASE}/{LOCALE}/{path}".rstrip("/")
            response = page.goto(url, wait_until="networkidle", timeout=120000)
            status = response.status if response else 0
            if status >= 400 or status == 0:
                failures.append(f"{url}: HTTP {status}")
                print(f"FAIL  {url}  HTTP {status}")
                continue
            page.add_script_tag(content=axe_source)
            result = page.evaluate(
                "async (tags) => await axe.run(document, { runOnly: { type: 'tag', values: tags } })", TAGS
            )
            violations = result["violations"]
            blocking = [v for v in violations if v.get("impact") in BLOCKING]
            minor = len(violations) - len(blocking)
            print(f"{'FAIL' if blocking else 'ok  '}  {url}  serious/critical {len(blocking)}, other {minor}")
            for v in blocking:
                nodes = [n.get("target", ["?"])[0] for n in v.get("nodes", [])][:5]
                failures.append(f"{url}: {v['id']} ({v['impact']}) x{len(v.get('nodes', []))} e.g. {nodes}")
        browser.close()
    if failures:
        print("\nserious or critical violations:")
        print(json.dumps(failures, ensure_ascii=False, indent=2))
        return 1
    print(f"\naxe: {len(PAGES)} pages, no serious or critical violation.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
