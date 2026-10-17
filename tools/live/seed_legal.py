"""TEST database only: publish the patient site's four policies from docs/legal before any journey runs.

A fresh gate database has no published policy, so /ar/terms, /ar/privacy, /ar/refund-policy and /ar/telehealth-consent
answer 404, and the site keeps that not-found in its data cache for an hour (lib/api/legal-policy.ts revalidates hourly),
so a journey that publishes a text later still reads 404. Production always has them published; the gate starts the same.
Idempotent: a policy that already has content is left as it is.
"""
import sys

import j_admin
from j_telehealth_consent import POLICIES, legal_text
from lib import Client

SITE_POLICIES = POLICIES + (
    # key, docs/legal file, applies_to, requires_acceptance, title_ar, title_en
    ('patient_terms', '01_PATIENT_TERMS.ar.md', ['patient'], False, 'شروط الاستخدام', 'Terms of use'),
    ('privacy_policy', '02_PRIVACY_POLICY.ar.md', ['all'], False, 'سياسة الخصوصية', 'Privacy policy'),
)


def main():
    admin, _ = j_admin.login()
    bad = 0
    for key, name, applies, required, ar, en in SITE_POLICIES:
        cur = Client().get(f'/legal/policy/{key}?lang=ar')
        if cur.ok and isinstance(cur.body, dict) and cur.body.get('content'):
            print(f'legal seed: {key} already published')
            continue
        r = admin.put(f'/admin/admin/legal/policy/{key}', {'title_ar': ar, 'title_en': en, 'version': '1.0', 'content_ar': legal_text(name),
                                                          'requires_acceptance': required, 'applies_to': applies, 'change_note': 'live gate seed (docs/legal 1.0)'})
        print(f'legal seed: {key} -> {r.status}')
        bad += 0 if r.ok else 1
    return bad


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
